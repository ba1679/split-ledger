import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { readAccessSettlement } from './access-fixture.js';
import {
  independentSplittingOracle,
  seedSplittingExpenses,
  snapshotSplittingSources,
} from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { requireProductColumns } from './schema.js';

export async function seedAmySettledBobOutstanding(world: LedgerWorld): Promise<void> {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await requireProductColumns(world, 'settlements', [
    'obligation_numerator',
    'obligation_denominator',
    'obligation_minor_unit',
    'arrangement_key',
    'source_revision',
    'simplify_debts',
  ]);
  await requireProductColumns(world, 'repayments', ['kind', 'settlement_id', 'paid_on']);
  await requireProductColumns(world, 'settlement_adjustments', [
    'settlement_id',
    'member_id',
    'numerator',
    'denominator',
    'minor_unit',
  ]);
  const before = await snapshotSplittingSources(world);
  const view = await readAccessSettlement(world);
  const tripId = splittingTripId(world);
  const ownerId = world.get<string>('splitting:ownerId');
  const amyId = splittingMemberId(world, 'Amy');
  const aliceId = splittingMemberId(world, 'Alice');
  const bobId = splittingMemberId(world, 'Bob');
  const obligation = { numerator: '100', denominator: '3', minorUnit: 0 };
  const amy = view.arrangements.find(
    (row) =>
      row.debtorMemberId === amyId &&
      row.creditorMemberId === aliceId &&
      row.currencyCode === 'JPY',
  );
  expect(amy, 'Amy must have an outstanding snack arrangement').toBeDefined();
  expect(independentSplittingOracle.equal(amy!.amount, obligation)).toBe(true);
  const settlementId = randomUUID();
  const repaymentId = randomUUID();
  const client = await world.db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "INSERT INTO settlements(id,owner_id,trip_id,debtor_member_id,creditor_member_id,currency_code,obligation_numerator,obligation_denominator,obligation_minor_unit,arrangement_key,source_revision,simplify_debts,created_at) VALUES($1,$2,$3,$4,$5,'JPY',100,3,0,$6,$7,$8,now())",
      [
        settlementId,
        ownerId,
        tripId,
        amyId,
        aliceId,
        amy!.key,
        view.accountingRevision,
        view.simplifyDebts,
      ],
    );
    await client.query(
      "INSERT INTO repayments(id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor,currency_code,minor_unit,paid_on,kind,settlement_id,created_at) VALUES($1,$2,$3,$4,$5,33,'JPY',0,'2027-01-20','settlement',$6,now())",
      [repaymentId, ownerId, tripId, amyId, aliceId, settlementId],
    );
    for (const [memberId, numerator] of [
      [amyId, '1'],
      [aliceId, '-1'],
    ] as const)
      await client.query(
        "INSERT INTO settlement_adjustments(settlement_id,owner_id,trip_id,member_id,currency_code,numerator,denominator,minor_unit) VALUES($1,$2,$3,$4,'JPY',$5,3,0)",
        [settlementId, ownerId, tripId, memberId, numerator],
      );
    await client.query(
      'UPDATE trips SET accounting_revision=accounting_revision+1 WHERE id=$1 AND owner_id=$2',
      [tripId, ownerId],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const snapshot = await snapshotSplittingSources(world);
  expect(snapshot.expenses).toEqual(before.expenses);
  expect(snapshot.shares).toEqual(before.shares);
  expect(snapshot.shares).toHaveLength(3);
  for (const member of [amyId, aliceId, bobId])
    expect(
      independentSplittingOracle.equal(
        independentSplittingOracle.share(snapshot, String(snapshot.expenses[0]!.id), member),
        obligation,
      ),
    ).toBe(true);
  expect(snapshot.settlements).toHaveLength(1);
  expect(snapshot.settlements[0]).toMatchObject({
    id: settlementId,
    debtor_member_id: amyId,
    creditor_member_id: aliceId,
    obligation_numerator: '100',
    obligation_denominator: '3',
    obligation_minor_unit: 0,
    arrangement_key: amy!.key,
    source_revision: view.accountingRevision,
  });
  expect(snapshot.repayments).toHaveLength(1);
  expect(snapshot.repayments[0]).toMatchObject({
    id: repaymentId,
    payer_member_id: amyId,
    payee_member_id: aliceId,
    amount_minor: '33',
    kind: 'settlement',
    settlement_id: settlementId,
  });
  expect(snapshot.adjustments).toHaveLength(2);
  for (const [memberId, numerator] of [
    [amyId, '1'],
    [aliceId, '-1'],
  ] as const)
    expect(snapshot.adjustments.find((row) => row.member_id === memberId)).toMatchObject({
      settlement_id: settlementId,
      numerator,
      denominator: '3',
      minor_unit: 0,
    });
  for (const [memberId, numerator, denominator] of [
    [amyId, '0', '1'],
    [aliceId, '100', '3'],
    [bobId, '-100', '3'],
  ] as const)
    expect(independentSplittingOracle.balance(snapshot, memberId, 'JPY')).toEqual({
      numerator,
      denominator,
      minorUnit: 0,
    });
  const latest = await readAccessSettlement(world);
  expect(BigInt(latest.accountingRevision)).toBe(BigInt(view.accountingRevision) + 1n);
  expect(latest.arrangements).toHaveLength(1);
  const bob = latest.arrangements[0]!;
  expect(bob).toMatchObject({
    debtorMemberId: bobId,
    creditorMemberId: aliceId,
    currencyCode: 'JPY',
  });
  expect(independentSplittingOracle.equal(bob.amount, obligation)).toBe(true);
  expect(bob.key).toEqual(expect.any(String));
  world.splitting.ids.settlements.set('Amy:Alice:JPY', settlementId);
  world.splitting.ids.repayments.set('settlement:Amy:Alice:JPY', repaymentId);
  world.splitting.snapshot = snapshot;
  world.set('splitting:historySnapshot', snapshot);
  world.set('splitting:sourceSnapshot', snapshot);
  world.set('splitting:settlementId', settlementId);
  world.set('splitting:settlementRepaymentId', repaymentId);
  world.set('splitting:arrangement', bob);
  world.set('splitting:revision', latest.accountingRevision);
  world.set('splitting:expectedAmount', bob.amount);
  world.set('splitting:newSettlementId', randomUUID());
  world.set('splitting:newRepaymentId', randomUUID());
}
