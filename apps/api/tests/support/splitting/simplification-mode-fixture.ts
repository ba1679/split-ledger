import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { requireProductColumns } from './schema.js';
import type { SourceSnapshot } from './types.js';

export type SimplificationMode = '開啟' | '關閉';

export function snapshotExactBalances(snapshot: SourceSnapshot) {
  const currencies = [
    ...new Set(
      [...snapshot.expenses, ...snapshot.repayments, ...snapshot.adjustments].map((row) =>
        String(row.currency_code),
      ),
    ),
  ].sort();

  return snapshot.members.flatMap((member) =>
    currencies.map((currencyCode) => ({
      memberId: String(member.id),
      currencyCode,
      amount: independentSplittingOracle.balance(snapshot, String(member.id), currencyCode),
    })),
  );
}

/** Arrange a persisted mode directly, without exercising the PATCH under test. */
export async function seedSimplificationMode(world: LedgerWorld, mode: string): Promise<void> {
  expect(['開啟', '關閉'], 'Simplification fixture mode must be 開啟 or 關閉').toContain(mode);
  await requireProductColumns(world, 'trips', ['simplify_debts', 'accounting_revision']);
  const before = await snapshotSplittingSources(world);
  const enabled = mode === '開啟';
  const result = await world.db.query(
    'UPDATE trips SET simplify_debts=$2 WHERE id=$1 RETURNING id,simplify_debts,accounting_revision::text',
    [splittingTripId(world), enabled],
  );
  expect(result.rows).toEqual([
    {
      id: splittingTripId(world),
      simplify_debts: enabled,
      accounting_revision: String(before.trips[0]!.accounting_revision),
    },
  ]);
  const after = await snapshotSplittingSources(world);
  expect(after, 'Fixture mode change must preserve every accounting source and revision').toEqual({
    ...before,
    trips: before.trips.map((trip) => ({ ...trip, simplify_debts: enabled })),
  });
  const balances = snapshotExactBalances(before);
  expect(snapshotExactBalances(after)).toEqual(balances);
  world.splitting.snapshot = after;
  world.set('splitting:simplifyDebts', enabled);
  world.set('splitting:mode', mode);
  world.set('splitting:revision', String(after.trips[0]!.accounting_revision));
  world.set('splitting:sourceSnapshot', after);
  world.set('splitting:before', after);
  world.set('splitting:balanceSnapshot', balances);
}
