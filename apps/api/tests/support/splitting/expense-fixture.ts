import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { requireProductColumns } from './schema.js';
import { seedSplittingMembers, splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot, SplittingOracle } from './types.js';

export interface SplittingExpenseRow {
  項目: string;
  幣別: string;
  金額: string;
  付款人: string;
  分攤者: string;
}

/** Fixture arithmetic deliberately does not import product money/rational functions. */
export function fixtureMinorAmount(amount: string, minorUnit: number): bigint {
  expect(Number.isInteger(minorUnit) && minorUnit >= 0 && minorUnit <= 4).toBe(true);
  expect(amount, 'Fixture amount must be an unsigned decimal string').toMatch(/^\d+(?:\.\d+)?$/);
  const [whole, fraction = ''] = amount.split('.');
  expect(
    fraction.length,
    'Fixture precision must fit its historical minor unit',
  ).toBeLessThanOrEqual(minorUnit);
  const result =
    BigInt(whole!) * 10n ** BigInt(minorUnit) + BigInt(fraction.padEnd(minorUnit, '0') || '0');
  expect(result > 0n && result <= 9223372036854775807n).toBe(true);

  return result;
}

function fraction(n: bigint, d: bigint, minorUnit: number): ExactAmount {
  if (d <= 0n) throw Error('Oracle denominator must be positive');
  let a = n < 0n ? -n : n,
    b = d;
  while (b !== 0n) [a, b] = [b, a % b];
  const gcd = a || 1n;

  return { numerator: (n / gcd).toString(), denominator: (d / gcd).toString(), minorUnit };
}

export const independentSplittingOracle: SplittingOracle = {
  share(snapshot, expenseId, memberId) {
    const expense = snapshot.expenses.find((row) => row.id === expenseId);
    if (!expense) throw Error(`Missing oracle expense: ${expenseId}`);
    const shares = snapshot.shares.filter((row) => row.expense_id === expenseId);
    if (!shares.some((row) => row.member_id === memberId))
      return fraction(0n, 1n, Number(expense.minor_unit));

    return fraction(
      BigInt(String(expense.amount_minor)),
      BigInt(shares.length),
      Number(expense.minor_unit),
    );
  },
  balance(snapshot, memberId, currencyCode) {
    const amounts = [...snapshot.expenses, ...snapshot.repayments, ...snapshot.adjustments].filter(
      (row) => row.currency_code === currencyCode,
    );
    const minorUnit = Math.max(0, ...amounts.map((row) => Number(row.minor_unit)));
    let n = 0n,
      d = 1n;
    const add = (numerator: bigint, denominator: bigint, unit: number) => {
      numerator *= 10n ** BigInt(minorUnit - unit);
      const result = fraction(n * denominator + numerator * d, d * denominator, minorUnit);
      n = BigInt(result.numerator);
      d = BigInt(result.denominator);
    };
    for (const row of snapshot.expenses.filter(
      (expense) => expense.currency_code === currencyCode,
    )) {
      const amount = BigInt(String(row.amount_minor)),
        unit = Number(row.minor_unit);
      if (row.payer_member_id === memberId) add(amount, 1n, unit);
      const shares = snapshot.shares.filter((share) => share.expense_id === row.id);
      if (shares.some((share) => share.member_id === memberId))
        add(-amount, BigInt(shares.length), unit);
    }
    for (const row of snapshot.repayments.filter(
      (repayment) => repayment.currency_code === currencyCode,
    )) {
      const amount = BigInt(String(row.amount_minor)),
        unit = Number(row.minor_unit);
      if (row.payer_member_id === memberId) add(amount, 1n, unit);
      if (row.payee_member_id === memberId) add(-amount, 1n, unit);
    }
    for (const row of snapshot.adjustments.filter(
      (adjustment) =>
        adjustment.currency_code === currencyCode && adjustment.member_id === memberId,
    ))
      add(BigInt(String(row.numerator)), BigInt(String(row.denominator)), Number(row.minor_unit));

    return fraction(n, d, minorUnit);
  },
  equal(left, right) {
    return (
      BigInt(left.numerator) * BigInt(right.denominator) * 10n ** BigInt(right.minorUnit) ===
      BigInt(right.numerator) * BigInt(left.denominator) * 10n ** BigInt(left.minorUnit)
    );
  },
};

export async function snapshotSplittingSources(
  world: LedgerWorld,
  tripId = splittingTripId(world),
): Promise<SourceSnapshot> {
  const tables = [
    ['trips', 'trips', 'id'],
    ['members', 'trip_members', 'trip_id'],
    ['expenses', 'expenses', 'trip_id'],
    ['shares', 'expense_shares', 'trip_id'],
    ['repayments', 'repayments', 'trip_id'],
    ['settlements', 'settlements', 'trip_id'],
    ['adjustments', 'settlement_adjustments', 'trip_id'],
  ] as const;
  const result: Record<string, readonly Record<string, unknown>[]> = {};
  for (const [key, table, filter] of tables) {
    await requireProductColumns(world, table, [filter]);
    // Identifiers come exclusively from the fixed table list above.
    const rows = await world.db.query(
      `SELECT * FROM ${table} WHERE ${filter}=$1 ORDER BY to_jsonb(${table})::text`,
      [tripId],
    );
    result[key] = rows.rows;
  }

  return result as unknown as SourceSnapshot;
}

export async function seedSplittingExpenses(
  world: LedgerWorld,
  rows: readonly SplittingExpenseRow[],
): Promise<void> {
  expect(rows.length, 'Expense fixture DataTable must contain rows').toBeGreaterThan(0);
  if (!world.splitting.ids.trips.has('日本旅行')) await seedSplittingMembers(world);
  await requireProductColumns(world, 'expenses', ['payer_member_id', 'amount_minor', 'minor_unit']);
  await requireProductColumns(world, 'expense_shares', [
    'owner_id',
    'trip_id',
    'expense_id',
    'member_id',
  ]);
  const tripId = splittingTripId(world);
  const trip = await world.db.query<{ owner_id: string }>(
    'SELECT owner_id FROM trips WHERE id=$1',
    [tripId],
  );
  expect(trip.rowCount).toBe(1);
  const ownerId = trip.rows[0]!.owner_id;
  const connection = await world.db.connect();
  const pending: [string, string][] = [];
  try {
    await connection.query('BEGIN');
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['項目', '幣別', '金額', '付款人', '分攤者'].sort());
      const currency = await connection.query<{ minor_unit: number }>(
        'SELECT minor_unit FROM currencies WHERE code=$1',
        [row.幣別],
      );
      expect(currency.rowCount, `Product currencies must contain ${row.幣別}`).toBe(1);
      const minorUnit = currency.rows[0]!.minor_unit;
      const amount = fixtureMinorAmount(row.金額, minorUnit);
      const memberIdFor = (name: string) =>
        splittingMemberId(world, name === 'owner' ? 'Alice' : name);
      const payer = memberIdFor(row.付款人);
      const shares = row.分攤者.split('、').map((name) => memberIdFor(name.trim()));
      expect(shares.length).toBeGreaterThan(0);
      expect(new Set(shares).size, 'Fixture shares must be unique').toBe(shares.length);
      const id = randomUUID();
      await connection.query(
        'INSERT INTO expenses(id,owner_id,trip_id,payer_member_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on) VALUES($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9)',
        [
          id,
          ownerId,
          tripId,
          payer,
          row.項目,
          amount.toString(),
          row.幣別,
          minorUnit,
          '2027-01-20',
        ],
      );
      for (const memberId of shares)
        await connection.query(
          'INSERT INTO expense_shares(owner_id,trip_id,expense_id,member_id) VALUES($1,$2,$3,$4)',
          [ownerId, tripId, id, memberId],
        );
      const stored = await connection.query(
        'SELECT *,spent_on::text AS fixture_spent_on FROM expenses WHERE id=$1',
        [id],
      );
      expect(stored.rows).toHaveLength(1);
      expect(stored.rows[0]).toMatchObject({
        owner_id: ownerId,
        trip_id: tripId,
        payer_member_id: payer,
        amount_minor: amount.toString(),
        currency_code: row.幣別,
        minor_unit: minorUnit,
        category_id: null,
        item: row.項目,
        fixture_spent_on: '2027-01-20',
      });
      const storedShares = await connection.query<{ member_id: string }>(
        'SELECT member_id FROM expense_shares WHERE expense_id=$1 ORDER BY member_id',
        [id],
      );
      expect(storedShares.rows.map((share) => share.member_id)).toEqual([...shares].sort());
      pending.push([row.項目, id]);
    }
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
  for (const [item, id] of pending) world.splitting.ids.expenses.set(item, id);
  const snapshot = await snapshotSplittingSources(world, tripId);
  expect(snapshot.repayments, 'Expense baseline must not contain repayment facts').toEqual([]);
  expect(snapshot.settlements, 'Expense baseline must not contain settlements').toEqual([]);
  expect(snapshot.adjustments, 'Expense baseline must not contain settlement adjustments').toEqual(
    [],
  );
  world.splitting.snapshot = snapshot;
  world.set('splitting:expenseSources', snapshot);
  world.set('splitting:sourceSnapshot', snapshot);
  world.set('splitting:oracle', independentSplittingOracle);
  world.set(
    'splitting:expenseIds',
    pending.map(([, id]) => id),
  );
  world.set(
    'splitting:expenseOracles',
    snapshot.shares.map((share) => ({
      expenseId: share.expense_id,
      memberId: share.member_id,
      amount: independentSplittingOracle.share(
        snapshot,
        String(share.expense_id),
        String(share.member_id),
      ),
    })),
  );
}
