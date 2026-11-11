import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const deletedDinnerResultPhrase = '晚餐已不再影響帳本與結算';

export function assertDinnerRemoved(
  before: SourceSnapshot,
  after: SourceSnapshot,
  expenseId: string,
): void {
  expect(before.expenses.find((row) => row.id === expenseId)?.item).toBe('晚餐');
  expect(after.expenses).toEqual(before.expenses.filter((row) => row.id !== expenseId));
  expect(after.shares).toEqual(before.shares.filter((row) => row.expense_id !== expenseId));
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Deleting dinner must preserve ${key}`).toEqual(before[key]);
}

export async function assertDeletedDinnerResult(world: LedgerWorld): Promise<void> {
  expect(world.response!.status(), 'Dinner deletion must succeed').toBe(204);
  expect(await world.response!.text()).toBe('');
  const tripId = splittingTripId(world);
  const expenseId = world.get<string>('splitting:expenseId');
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertDinnerRemoved(before, after, expenseId);
  // This sentence's fixture has dinner as its only accounting source.
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], 'No dinner contribution may remain in the authority snapshot').toEqual([]);

  for (let read = 0; read < 2; read++) {
    const single = await callApi(world, 'GET', `/api/trips/${tripId}/expenses/${expenseId}`);
    expect(single.status()).toBe(404);
    const list = await callApi(world, 'GET', `/api/trips/${tripId}/expenses`);
    expect(list.status()).toBe(200);
    expect((await list.json()).items).toEqual([]);
    const settlement = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
    expect(settlement.status(), 'Product must rebuild settlement after deletion').toBe(200);
    const view = (await settlement.json()) as {
      balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
      arrangements: unknown[];
    };
    expect(view.arrangements).toEqual([]);
    expect(Array.isArray(view.balances)).toBe(true);
    for (const balance of view.balances) {
      expect(after.members.some((member) => member.id === balance.memberId)).toBe(true);
      expect(
        independentSplittingOracle.equal(
          balance.netAmount,
          independentSplittingOracle.balance(after, balance.memberId, balance.currencyCode),
        ),
        'Every remaining currency balance must equal the zero-source oracle',
      ).toBe(true);
    }
  }
  expect(await snapshotSplittingSources(world), 'Verification reads must preserve sources').toEqual(
    after,
  );
}
