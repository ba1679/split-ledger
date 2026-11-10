import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures.js';
import { callApi, seedSession } from './seed.js';
import { seedSplittingExpenses, snapshotSplittingSources } from './splitting/expense-fixture.js';
import { splittingTripId } from './splitting/members-fixture.js';
import type { LedgerWorld } from './world.js';
import { settlementRaceBarrier } from './splitting/concurrent-settlement-command.js';

async function pendingPartial(world: LedgerWorld) {
  await seedSplittingExpenses(world, [
    { 項目: 'Lunch', 幣別: 'JPY', 金額: '15000', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  const tripId = splittingTripId(world);
  const state = await (await callApi(world, 'GET', `/api/trips/${tripId}/settlement`)).json();
  const edge = state.arrangements[0];

  return {
    tripId,
    command: {
      id: randomUUID(),
      repaymentId: randomUUID(),
      arrangementKey: edge.key,
      accountingRevision: state.accountingRevision,
      debtorMemberId: edge.debtorMemberId,
      creditorMemberId: edge.creditorMemberId,
      currencyCode: 'JPY',
      expectedAmount: edge.amount,
      paidAmount: '2000',
      paidOn: '2026-11-11',
    },
  };
}

test('an insufficient arrangement payment preserves payable debt and can be paid off later', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: 'Lunch', 幣別: 'KRW', 金額: '15000', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  const tripId = splittingTripId(world);

  async function pay(amount: string) {
    const state = await (await callApi(world, 'GET', `/api/trips/${tripId}/settlement`)).json();
    const arrangement = state.arrangements[0];
    const command = {
      id: randomUUID(),
      repaymentId: randomUUID(),
      arrangementKey: arrangement.key,
      accountingRevision: state.accountingRevision,
      debtorMemberId: arrangement.debtorMemberId,
      creditorMemberId: arrangement.creditorMemberId,
      currencyCode: arrangement.currencyCode,
      expectedAmount: arrangement.amount,
      paidAmount: amount,
      paidOn: '2026-11-11',
    };
    const response = await callApi(world, 'POST', `/api/trips/${tripId}/settlements`, command);

    expect(response.status()).toBe(201);

    return { result: await response.json(), command };
  }

  const { result, command } = await pay('2000');

  expect(result).toMatchObject({
    kind: 'partial',
    remainingAmount: { numerator: '13000', denominator: '1', minorUnit: 0 },
    repayment: { id: command.repaymentId, amount: '2000', kind: 'independent', settlementId: null },
  });
  const original = await callApi(
    world,
    'GET',
    `/api/trips/${tripId}/repayments/${command.repaymentId}`,
  );

  expect(await original.json()).toEqual(result.repayment);
  const source = await world.db.query(
    'SELECT (SELECT count(*) FROM settlements WHERE trip_id=$1)::int AS settlements,(SELECT count(*) FROM settlement_adjustments WHERE trip_id=$1)::int AS adjustments',
    [tripId],
  );

  expect(source.rows).toEqual([{ settlements: 0, adjustments: 0 }]);
  const remaining = await (await callApi(world, 'GET', `/api/trips/${tripId}/settlement`)).json();

  expect(remaining.arrangements).toHaveLength(1);
  expect(remaining.arrangements[0].amount).toEqual({
    numerator: '13000',
    denominator: '1',
    minorUnit: 0,
  });
  const stale = await callApi(world, 'POST', `/api/trips/${tripId}/settlements`, {
    ...command,
    id: randomUUID(),
    repaymentId: randomUUID(),
  });

  expect(stale.status()).toBe(409);
  expect((await stale.json()).code).toBe('ACCOUNTING_REVISION_CONFLICT');
  const final = await pay('13000');

  expect(final.result).not.toHaveProperty('kind');
  const balanced = await (await callApi(world, 'GET', `/api/trips/${tripId}/settlement`)).json();

  expect(balanced.arrangements).toEqual([]);
  expect(
    balanced.balances.every(
      (balance: { netAmount: { numerator: string } }) => balance.netAmount.numerator === '0',
    ),
  ).toBe(true);
  expect(
    (
      await world.db.query(
        'SELECT amount_minor::text AS amount,kind FROM repayments WHERE trip_id=$1 ORDER BY amount_minor',
        [tripId],
      )
    ).rows,
  ).toEqual([
    { amount: '2000', kind: 'independent' },
    { amount: '13000', kind: 'settlement' },
  ]);
});

test('a partial-payment failure rolls back the payment and revision together', async ({
  world,
}) => {
  const { tripId, command } = await pendingPartial(world);
  const before = await snapshotSplittingSources(world);
  const previous = world.splitting.hooks;
  let reached = false;
  world.splitting.hooks = {
    afterRepaymentInsert: async () => {
      reached = true;
      throw new Error('Isolated partial payment fault');
    },
  };
  try {
    const response = await callApi(world, 'POST', `/api/trips/${tripId}/settlements`, command);
    expect(response.status()).toBe(500);
    expect(reached).toBe(true);
    expect(await snapshotSplittingSources(world)).toEqual(before);
  } finally {
    world.splitting.hooks = previous;
  }
});

test('two partial payments from one arrangement version serialize into one cash fact', async ({
  world,
}) => {
  const { tripId, command } = await pendingPartial(world);
  const commands = [
    command,
    { ...command, id: randomUUID(), repaymentId: randomUUID(), paidAmount: '3000' },
  ];
  const sessions = await Promise.all([seedSession(world), seedSession(world)]);
  const barrier = settlementRaceBarrier(commands.map((entry) => entry.id));
  const previous = world.splitting.hooks;
  world.splitting.hooks = { beforeTripLock: (context) => barrier.enter(context) };
  try {
    const responses = await Promise.all(
      commands.map((data, index) =>
        world.api.post(`/api/trips/${tripId}/settlements`, {
          headers: { Cookie: sessions[index]!.cookie, Origin: world.get<string>('webOrigin') },
          data,
        }),
      ),
    );
    expect(responses.map((response) => response.status()).sort()).toEqual([201, 409]);
    const winner = await responses.find((response) => response.status() === 201)!.json();
    expect(winner.kind).toBe('partial');
    const after = await snapshotSplittingSources(world);
    expect(after.repayments).toHaveLength(1);
    expect(after.settlements).toEqual([]);
    expect(after.adjustments).toEqual([]);
    expect(String(after.trips[0]!.accounting_revision)).toBe(
      (BigInt(command.accountingRevision) + 1n).toString(),
    );
    const current = await (await callApi(world, 'GET', `/api/trips/${tripId}/settlement`)).json();
    expect(current.arrangements).toHaveLength(1);
    expect(current.arrangements[0].amount).toEqual(winner.remainingAmount);
  } finally {
    barrier.dispose();
    world.splitting.hooks = previous;
  }
});
