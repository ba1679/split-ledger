import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import {
  fixtureMinorAmount,
  independentSplittingOracle,
  snapshotSplittingSources,
} from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { seedAmySettledBobOutstanding } from './sequential-settlement-fixture.js';

/** Immutable history for the subsequent mode-switch command, with no command under test run. */
export async function seedPaymentHistorySources(world: LedgerWorld): Promise<void> {
  await seedAmySettledBobOutstanding(world);
  const settled = await snapshotSplittingSources(world);
  await seedSplittingRepayments(world, [
    { 付款人: 'Bob', 收款人: 'Alice', 幣別: 'JPY', 金額: '10', 日期: '2027-01-20' },
  ]);
  const tripId = splittingTripId(world);
  const ownerId = world.get<string>('splitting:ownerId');
  const aliceId = splittingMemberId(world, 'Alice');
  const amyId = splittingMemberId(world, 'Amy');
  const bobId = splittingMemberId(world, 'Bob');
  const currency = await world.db.query<{ minor_unit: number }>(
    "SELECT minor_unit FROM currencies WHERE code='TWD'",
  );
  expect(currency.rows, 'Product currency seed must contain TWD').toHaveLength(1);
  const minorUnit = currency.rows[0]!.minor_unit;
  const amountMinor = fixtureMinorAmount('300', minorUnit).toString();
  const expenseId = randomUUID();
  const client = await world.db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "INSERT INTO expenses(id,owner_id,trip_id,payer_member_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on) VALUES($1,$2,$3,$4,NULL,'交通',$5,'TWD',$6,'2027-01-20')",
      [expenseId, ownerId, tripId, aliceId, amountMinor, minorUnit],
    );
    await client.query(
      'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
      [ownerId, tripId, expenseId, bobId],
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
  world.splitting.ids.expenses.set('交通', expenseId);
  const snapshot = await snapshotSplittingSources(world);
  expect(snapshot.trips).toHaveLength(1);
  expect(snapshot.trips[0]!.simplify_debts).toBe(false);
  expect(snapshot.expenses).toHaveLength(2);
  expect(snapshot.shares).toHaveLength(4);
  for (const expense of settled.expenses)
    expect(snapshot.expenses.find((row) => row.id === expense.id)).toEqual(expense);
  for (const share of settled.shares) expect(snapshot.shares).toContainEqual(share);
  expect(snapshot.expenses.find((row) => row.id === expenseId)).toMatchObject({
    owner_id: ownerId,
    trip_id: tripId,
    payer_member_id: aliceId,
    currency_code: 'TWD',
    amount_minor: amountMinor,
    minor_unit: minorUnit,
  });
  expect(snapshot.shares.filter((row) => row.expense_id === expenseId)).toEqual([
    expect.objectContaining({ member_id: bobId, owner_id: ownerId, trip_id: tripId }),
  ]);
  expect(snapshot.repayments).toHaveLength(2);
  expect(snapshot.repayments).toContainEqual(settled.repayments[0]);
  expect(snapshot.repayments.find((row) => row.kind === 'independent')).toMatchObject({
    payer_member_id: bobId,
    payee_member_id: aliceId,
    currency_code: 'JPY',
    amount_minor: '10',
    minor_unit: 0,
    settlement_id: null,
  });
  expect(snapshot.settlements).toEqual(settled.settlements);
  expect(snapshot.adjustments).toEqual(settled.adjustments);
  const balances = [
    [amyId, 'JPY', '0', '1'],
    [bobId, 'JPY', '-70', '3'],
    [aliceId, 'JPY', '70', '3'],
    [amyId, 'TWD', '0', '1'],
    [bobId, 'TWD', '-300', '1'],
    [aliceId, 'TWD', '300', '1'],
  ] as const;
  for (const [memberId, currencyCode, numerator, denominator] of balances)
    expect(
      independentSplittingOracle.equal(
        independentSplittingOracle.balance(snapshot, memberId, currencyCode),
        { numerator, denominator, minorUnit: 0 },
      ),
    ).toBe(true);
  world.splitting.snapshot = snapshot;
  world.set('splitting:historySnapshot', snapshot);
  world.set('splitting:sourceSnapshot', snapshot);
  world.set('splitting:oracle', independentSplittingOracle);
  world.set('splitting:revision', String(snapshot.trips[0]!.accounting_revision));
  world.set(
    'splitting:balanceOracles',
    balances.map(([memberId, currencyCode]) => ({
      memberId,
      currencyCode,
      amount: independentSplittingOracle.balance(snapshot, memberId, currencyCode),
    })),
  );
}
