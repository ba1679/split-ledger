import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import { assertCurrencyZeroSums } from './zero-sum-result.js';
import type { DeterministicSettlementView } from './reproducible-settlement-result.js';
import type { SourceSnapshot } from './types.js';

export const noOutstandingArrangementsPhrase = '結算中沒有任何待付款安排';

/** A displayed zero cannot conceal any nonzero exact source net. */
export function assertNoOutstandingProjection(
  snapshot: SourceSnapshot,
  view: DeterministicSettlementView,
): void {
  expect(view.arrangements).toEqual([]);
  expect(view.directArrangementCount).toBe(0);
  expect(view.suggestedArrangementCount).toBe(0);
  expect(view.accountingRevision).toBe(String(snapshot.trips[0]!.accounting_revision));
  for (const balance of snapshotExactBalances(snapshot))
    expect(
      BigInt(balance.amount.numerator),
      'Every source member/currency net must be exactly zero, including sub-minor amounts',
    ).toBe(0n);
  expect(Array.isArray(view.balances)).toBe(true);
  assertCurrencyZeroSums(snapshot, view.balances);
  for (const balance of view.balances) expect(BigInt(balance.netAmount.numerator)).toBe(0n);
}

export async function assertNoOutstandingArrangements(world: LedgerWorld): Promise<void> {
  expect(world.response, 'An owner settlement query must precede this Then').toBeDefined();
  expect(world.response!.status()).toBe(200);
  const before = await snapshotSplittingSources(world);
  const initial = (await world.response!.json()) as DeterministicSettlementView;
  assertNoOutstandingProjection(before, initial);
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status()).toBe(200);
  const reread = (await response.json()) as DeterministicSettlementView;
  assertNoOutstandingProjection(before, reread);
  expect(reread).toEqual(initial);
  expect(await snapshotSplittingSources(world), 'Repeated reads preserve all source rows').toEqual(
    before,
  );
}
