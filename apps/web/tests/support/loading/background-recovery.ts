import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import type { ExpenseList } from '../../../src/api/index.js';
import { arrangeBackgroundRead, type BackgroundRead } from './background-fixture.js';
import { triggerBackground } from './trigger-background.js';
import { assertBackgroundFailed } from './background-failed.js';
import { assertBackgroundRetained } from './background-retained.js';
import { managementUI } from '../trips/management-fixture.js';

export async function arrangeBackgroundRecovery(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeBackgroundRead(page, world, '明確失敗');
  await triggerBackground(world);
  await assertBackgroundFailed(world);
  const state = world.get<BackgroundRead>('loading:background');
  const prior = state.before,
    changed = state.pagination.first.items.slice(0, 2);
  expect(changed.map((expense) => expense.currencyCode)).toEqual(['TWD', 'TWD']);
  // Persist newer values for the same IDs without changing the full-book total.
  for (const [index, expense] of changed.entries()) {
    const response = await callApi(
      world,
      'PATCH',
      `/api/trips/${state.pagination.tripId}/expenses/${expense.id}`,
      { amount: index === 0 ? '300' : '100' },
      'Alice',
    );
    expect(response.status()).toBe(200);
  }
  const latest = await managementSnapshot(world);
  const changedIds = changed.map((expense) => expense.id);
  expect(latest.expenses.map((expense) => expense.id).sort()).toEqual(
    prior.expenses.map((expense) => expense.id).sort(),
  );
  expect(latest.expenses.filter((expense) => !changedIds.includes(String(expense.id)))).toEqual(
    prior.expenses.filter((expense) => !changedIds.includes(String(expense.id))),
  );
  expect(
    changedIds.map((id) =>
      String(latest.expenses.find((expense) => expense.id === id)!.amount_minor),
    ),
  ).toEqual(['30000', '10000']);
  for (const key of [
    'members',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
    'receipts',
    'reservations',
    'categories',
  ] as const)
    expect(latest[key]).toEqual(prior[key]);
  expect(String(latest.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(prior.trips[0]!.accounting_revision)) + 2n),
  );
  for (const member of latest.members)
    for (const currency of ['JPY', 'TWD'])
      expect(
        independentSplittingOracle.equal(
          independentSplittingOracle.balance(latest, String(member.id), currency),
          independentSplittingOracle.balance(prior, String(member.id), currency),
        ),
      ).toBe(true);
  const pages: ExpenseList[] = [];
  for (const cursor of [null, state.pagination.cursor]) {
    const response = await ownerRead(
      world,
      `/api/trips/${state.pagination.tripId}/expenses${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    expect(response.status()).toBe(200);
    pages.push((await response.json()) as ExpenseList);
  }
  expect(pages.flatMap((data) => data.items).map((expense) => expense.id)).toEqual(
    state.originalIds,
  );
  expect(pages[0]!.nextCursor).toBe(state.pagination.cursor);
  expect(pages[1]!.nextCursor).toBeNull();
  state.before = latest;
  state.expectedPages = pages;
  state.result = '成功';
  world.set('management:before', latest);
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await assertBackgroundRetained(world);
  expect(state.requests.length).toBe(1);
  expect(managementUI(world).writes.length).toBe(0);
  world.set('loading:backgroundRecovery', {
    changedIds,
    beforeReads: state.requests.length,
    expectedPages: pages,
  });
}
