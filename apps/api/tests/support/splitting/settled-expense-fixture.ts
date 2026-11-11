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

/** Completed historical state; the scenario Act is the later source correction. */
export async function seedOriginalSettledExpense(world: LedgerWorld): Promise<void> {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Amy' },
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
  const tripId = splittingTripId(world);
  const ownerId = world.get<string>('splitting:ownerId');
  const debtorId = splittingMemberId(world, 'Amy');
  const creditorId = splittingMemberId(world, 'Alice');
  const source = await snapshotSplittingSources(world);
  expect(source.expenses).toHaveLength(1);
  expect(source.shares).toHaveLength(1);
  const view = await readAccessSettlement(world);
  expect(view.arrangements).toHaveLength(1);
  const arrangement = view.arrangements[0]!;
  expect(arrangement).toMatchObject({
    debtorMemberId: debtorId,
    creditorMemberId: creditorId,
    currencyCode: 'JPY',
  });
  expect(
    independentSplittingOracle.equal(arrangement.amount, {
      numerator: '100',
      denominator: '1',
      minorUnit: 0,
    }),
  ).toBe(true);
  const settlementId = randomUUID();
  const repaymentId = randomUUID();
  const connection = await world.db.connect();
  try {
    await connection.query('BEGIN');
    await connection.query(
      "INSERT INTO settlements(id,owner_id,trip_id,debtor_member_id,creditor_member_id,currency_code,obligation_numerator,obligation_denominator,obligation_minor_unit,arrangement_key,source_revision,simplify_debts,created_at) VALUES($1,$2,$3,$4,$5,'JPY',100,1,0,$6,$7,$8,now())",
      [
        settlementId,
        ownerId,
        tripId,
        debtorId,
        creditorId,
        arrangement.key,
        view.accountingRevision,
        view.simplifyDebts,
      ],
    );
    await connection.query(
      "INSERT INTO repayments(id,owner_id,trip_id,payer_member_id,payee_member_id,amount_minor,currency_code,minor_unit,paid_on,kind,settlement_id,created_at) VALUES($1,$2,$3,$4,$5,33,'JPY',0,'2027-01-20','settlement',$6,now())",
      [repaymentId, ownerId, tripId, debtorId, creditorId, settlementId],
    );
    for (const [memberId, numerator] of [
      [debtorId, '67'],
      [creditorId, '-67'],
    ] as const)
      await connection.query(
        "INSERT INTO settlement_adjustments(settlement_id,owner_id,trip_id,member_id,currency_code,numerator,denominator,minor_unit) VALUES($1,$2,$3,$4,'JPY',$5,1,0)",
        [settlementId, ownerId, tripId, memberId, numerator],
      );
    await connection.query(
      'UPDATE trips SET accounting_revision=accounting_revision+1 WHERE id=$1 AND owner_id=$2',
      [tripId, ownerId],
    );
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
  const snapshot = await snapshotSplittingSources(world);
  expect(snapshot.expenses).toEqual(source.expenses);
  expect(snapshot.shares).toEqual(source.shares);
  expect(snapshot.settlements).toHaveLength(1);
  expect(snapshot.repayments).toHaveLength(1);
  expect(snapshot.adjustments).toHaveLength(2);
  expect(snapshot.settlements[0]).toMatchObject({
    id: settlementId,
    owner_id: ownerId,
    trip_id: tripId,
    debtor_member_id: debtorId,
    creditor_member_id: creditorId,
    currency_code: 'JPY',
    obligation_numerator: '100',
    obligation_denominator: '1',
    obligation_minor_unit: 0,
    arrangement_key: arrangement.key,
    source_revision: view.accountingRevision,
    simplify_debts: view.simplifyDebts,
  });
  expect(snapshot.repayments[0]).toMatchObject({
    id: repaymentId,
    owner_id: ownerId,
    trip_id: tripId,
    payer_member_id: debtorId,
    payee_member_id: creditorId,
    amount_minor: '33',
    currency_code: 'JPY',
    minor_unit: 0,
    kind: 'settlement',
    settlement_id: settlementId,
  });
  const paidOn = await world.db.query('SELECT paid_on::text FROM repayments WHERE id=$1', [
    repaymentId,
  ]);
  expect(paidOn.rows).toEqual([{ paid_on: '2027-01-20' }]);
  for (const [memberId, numerator] of [
    [debtorId, '67'],
    [creditorId, '-67'],
  ] as const) {
    expect(snapshot.adjustments.find((row) => row.member_id === memberId)).toMatchObject({
      settlement_id: settlementId,
      owner_id: ownerId,
      trip_id: tripId,
      member_id: memberId,
      currency_code: 'JPY',
      numerator,
      denominator: '1',
      minor_unit: 0,
    });
    expect(independentSplittingOracle.balance(snapshot, memberId, 'JPY').numerator).toBe('0');
  }
  expect(String(snapshot.trips[0]!.accounting_revision)).toBe(
    (BigInt(view.accountingRevision) + 1n).toString(),
  );
  const expenseId = String(snapshot.expenses[0]!.id);
  world.splitting.ids.settlements.set('Amy:Alice:JPY', settlementId);
  world.splitting.ids.repayments.set('settlement:Amy:Alice:JPY', repaymentId);
  world.splitting.snapshot = snapshot;
  world.set('backend:expenseId', expenseId);
  world.set('splitting:originalExpenseId', expenseId);
  world.set('splitting:settlementId', settlementId);
  world.set('splitting:settlementRepaymentId', repaymentId);
  world.set('splitting:historySnapshot', snapshot);
  world.set('splitting:sourceSnapshot', snapshot);
  world.set('splitting:revision', String(snapshot.trips[0]!.accounting_revision));
}
