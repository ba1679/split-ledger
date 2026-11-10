import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import { callApi, seedIdentity } from '../seed.js';
import type { LedgerWorld } from '../world.js';
import {
  seedSplittingExpenses,
  snapshotSplittingSources,
  independentSplittingOracle,
} from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { requireProductColumns } from './schema.js';

export interface AccessArrangement {
  key: string;
  debtorMemberId: string;
  creditorMemberId: string;
  currencyCode: string;
  amount: ExactAmount;
}

export interface AccessSettlementView {
  accountingRevision: string;
  simplifyDebts: boolean;
  arrangements: AccessArrangement[];
}

export async function readAccessSettlement(world: LedgerWorld): Promise<AccessSettlementView> {
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status(), 'Product must provide the owner settlement projection').toBe(200);
  const view = (await response.json()) as AccessSettlementView;
  expect(view.accountingRevision).toMatch(/^\d+$/);
  expect(Array.isArray(view.arrangements)).toBe(true);

  return view;
}

/** Direct history arrangement, using an owner-read real arrangement key rather than a fake command. */
export async function seedAccessSettlementHistory(world: LedgerWorld): Promise<void> {
  await requireProductColumns(world, 'settlements', ['obligation_numerator', 'source_revision']);
  await requireProductColumns(world, 'settlement_adjustments', ['numerator', 'denominator']);
  const view = await readAccessSettlement(world);
  const debtor = splittingMemberId(world, 'Amy');
  const creditor = splittingMemberId(world, 'Alice');
  const arrangement = view.arrangements.find(
    (row) =>
      row.debtorMemberId === debtor &&
      row.creditorMemberId === creditor &&
      row.currencyCode === 'JPY',
  );
  expect(arrangement, 'Fixture must have Amy owing Alice JPY 600').toBeDefined();
  expect(
    independentSplittingOracle.equal(arrangement!.amount, {
      numerator: '600',
      denominator: '1',
      minorUnit: 0,
    }),
  ).toBe(true);
  const settlementId = randomUUID(),
    repaymentId = randomUUID();
  const tripId = splittingTripId(world),
    ownerId = world.get<string>('splitting:ownerId');
  const client = await world.db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO settlements(id,owner_id,trip_id,debtor_member_id,creditor_member_id,currency_code,obligation_numerator,obligation_denominator,obligation_minor_unit,arrangement_key,source_revision,simplify_debts,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())',
      [
        settlementId,
        ownerId,
        tripId,
        debtor,
        creditor,
        'JPY',
        arrangement!.amount.numerator,
        arrangement!.amount.denominator,
        arrangement!.amount.minorUnit,
        arrangement!.key,
        view.accountingRevision,
        view.simplifyDebts,
      ],
    );
    await client.query(
      "INSERT INTO repayments(id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor,currency_code,minor_unit,paid_on,kind,settlement_id,created_at) VALUES($1,$2,$3,$4,$5,600,'JPY',0,'2027-01-20','settlement',$6,now())",
      [repaymentId, ownerId, tripId, debtor, creditor, settlementId],
    );
    for (const memberId of [debtor, creditor])
      await client.query(
        "INSERT INTO settlement_adjustments(settlement_id,owner_id,trip_id,member_id,currency_code,numerator,denominator,minor_unit) VALUES($1,$2,$3,$4,'JPY',0,1,0)",
        [settlementId, ownerId, tripId, memberId],
      );
    await client.query('UPDATE trips SET accounting_revision=accounting_revision+1 WHERE id=$1', [
      tripId,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  world.splitting.ids.settlements.set('Amy:Alice:JPY', settlementId);
  world.splitting.ids.repayments.set('settlement:Amy:Alice:JPY', repaymentId);
  world.set('splitting:settlementId', settlementId);
  world.set('splitting:settlementRepaymentId', repaymentId);
  const snapshot = await snapshotSplittingSources(world);
  expect(snapshot.settlements).toHaveLength(1);
  expect(snapshot.repayments).toHaveLength(2);
  expect(snapshot.adjustments).toHaveLength(2);
  expect(
    snapshot.adjustments
      .map((row) => ({
        memberId: row.member_id,
        numerator: String(row.numerator),
        denominator: String(row.denominator),
      }))
      .sort((a, b) => String(a.memberId).localeCompare(String(b.memberId))),
  ).toEqual(
    [debtor, creditor].sort().map((memberId) => ({ memberId, numerator: '0', denominator: '1' })),
  );
  expect(independentSplittingOracle.balance(snapshot, debtor, 'JPY').numerator).toBe('0');
}

export async function seedSplittingAccessSources(world: LedgerWorld): Promise<void> {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '晚餐', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Bob' },
  ]);
  await seedSplittingRepayments(world, [
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-19' },
  ]);
  await seedAccessSettlementHistory(world);
}

export async function seedUnauthorizedSplittingAccount(world: LedgerWorld): Promise<void> {
  await seedSplittingAccessSources(world);
  const foreign = await seedIdentity(world, '乙');
  const owner = world.users.get('甲')!;
  expect(foreign.id).not.toBe(owner.id);
  await world.db.query('UPDATE auth."user" SET name=$2 WHERE id=$1', [foreign.id, 'Amy']);
  world.users.set('乙', { ...foreign, name: 'Amy' });
  expect(
    (
      await world.db.query('SELECT id FROM auth."user" WHERE id=ANY($1::text[]) ORDER BY id', [
        [owner.id, foreign.id],
      ])
    ).rows.map((row) => row.id),
  ).toEqual([owner.id, foreign.id].sort());
  expect(
    (
      await world.db.query('SELECT owner_id FROM trip_members WHERE trip_id=$1', [
        splittingTripId(world),
      ])
    ).rows.every((row) => row.owner_id === owner.id),
  ).toBe(true);
  const view = await readAccessSettlement(world);
  const arrangement = view.arrangements.find(
    (row) => row.debtorMemberId === splittingMemberId(world, 'Bob'),
  );
  expect(
    arrangement,
    'Owner must obtain an outstanding arrangement for forbidden settlement write',
  ).toBeDefined();
  const snapshot = await snapshotSplittingSources(world);
  world.splitting.snapshot = snapshot;
  world.set('splitting:sourceSnapshot', snapshot);
  world.set('splitting:accessBefore', snapshot);
  world.set('splitting:accessOwner', owner);
  world.set('splitting:accessForeign', world.users.get('乙'));
  world.set('splitting:accessView', view);
  world.set('splitting:accessArrangement', arrangement);
  world.set('splitting:accessExpenseId', world.splitting.ids.expenses.get('午餐'));
  world.set('splitting:accessMemberId', splittingMemberId(world, 'Amy'));
  world.set('splitting:accessRepaymentId', world.get<string[]>('splitting:repaymentIds')[0]);
  world.set('splitting:revision', view.accountingRevision);
  world.set(
    'splitting:accessForeignSources',
    (await world.db.query('SELECT id FROM trips WHERE owner_id=$1', [foreign.id])).rows,
  );
}
