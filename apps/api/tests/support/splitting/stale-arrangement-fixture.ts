import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { requireProductColumns } from './schema.js';

/** Commit another device's personal expense while preserving the command's old snapshot. */
export async function seedExpenseAfterArrangement(world: LedgerWorld): Promise<void> {
  const pending = structuredClone(
    world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot'),
  );
  const arrangement = structuredClone(world.get('splitting:arrangement'));
  const before = await snapshotSplittingSources(world);
  await requireProductColumns(world, 'trips', ['accounting_revision']);
  await requireProductColumns(world, 'expenses', ['payer_member_id']);
  await requireProductColumns(world, 'expense_shares', [
    'owner_id',
    'trip_id',
    'expense_id',
    'member_id',
  ]);
  expect(String(before.trips[0]!.accounting_revision)).toBe(pending.accountingRevision);
  const tripId = splittingTripId(world);
  const aliceId = splittingMemberId(world, 'Alice');
  const expenseId = randomUUID();
  const connection = await world.db.connect();
  try {
    await connection.query('BEGIN');
    const trip = await connection.query<{ owner_id: string }>(
      'SELECT owner_id FROM trips WHERE id=$1 FOR UPDATE',
      [tripId],
    );
    expect(trip.rowCount).toBe(1);
    const ownerId = trip.rows[0]!.owner_id;
    const currency = await connection.query<{ minor_unit: number }>(
      'SELECT minor_unit FROM currencies WHERE code=$1',
      ['JPY'],
    );
    expect(currency.rows).toEqual([{ minor_unit: 0 }]);
    await connection.query(
      'INSERT INTO expenses(id,owner_id,trip_id,payer_member_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on) VALUES($1,$2,$3,$4,NULL,$5,10,$6,0,$7)',
      [expenseId, ownerId, tripId, aliceId, '另一裝置新增的個人支出', 'JPY', '2027-01-20'],
    );
    await connection.query(
      'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
      [ownerId, tripId, expenseId, aliceId],
    );
    await connection.query(
      'UPDATE trips SET accounting_revision=accounting_revision+1 WHERE id=$1',
      [tripId],
    );
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
  const after = await snapshotSplittingSources(world);
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    (BigInt(pending.accountingRevision) + 1n).toString(),
  );
  expect(after.expenses).toHaveLength(before.expenses.length + 1);
  expect(after.expenses.filter((row) => row.id !== expenseId)).toEqual(before.expenses);
  expect(after.expenses.find((row) => row.id === expenseId)).toMatchObject({
    payer_member_id: aliceId,
    amount_minor: '10',
    currency_code: 'JPY',
    minor_unit: 0,
  });
  expect(after.shares.filter((row) => row.expense_id !== expenseId)).toEqual(before.shares);
  expect(after.shares.filter((row) => row.expense_id === expenseId)).toEqual([
    expect.objectContaining({ member_id: aliceId }),
  ]);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.settlements).toEqual(before.settlements);
  expect(after.adjustments).toEqual(before.adjustments);
  expect(world.get('splitting:settlementSnapshot')).toEqual(pending);
  expect(world.get('splitting:arrangement')).toEqual(arrangement);
  world.splitting.ids.expenses.set('另一裝置新增的個人支出', expenseId);
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
  world.set('splitting:before', after);
  world.set('splitting:staleArrangementBefore', before);
}
