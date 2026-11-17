import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { expenseRows, visibleExpenseIds } from './pagination-fixture.js';
import type { BackgroundRead } from './background-fixture.js';
import { managementUI } from '../trips/management-fixture.js';

export async function assertBackgroundRetained(world: LedgerWorld): Promise<void> {
  const state = world.get<BackgroundRead>('loading:background'),
    ui = managementUI(world),
    page = ui.page;
  const rows = expenseRows(page, state.pagination.tripId);
  await expect(rows).toHaveCount(25);
  expect(await visibleExpenseIds(page, state.pagination.tripId)).toEqual(state.originalIds);
  expect(await rows.allTextContents()).toEqual(state.originalText);
  for (const row of await rows.all()) await expect(row).toBeVisible();
  await expect(page.getByRole('region', { name: '分幣別總額', exact: true })).toHaveText(
    state.totalsText,
    { useInnerText: true },
  );
  await expect(page.getByText(/^(?:共\s*)?0\s*筆(?:紀錄|支出)?$/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '載入更多', exact: true })).toHaveCount(0);
  await expect(
    page.locator('[data-skeleton]:visible, .skeleton:visible, .query-skeleton:visible'),
  ).toHaveCount(0);
  await expect(state.focus).toBeFocused();
  expect(ui.writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  expect(await managementSnapshot(world, state.pagination.untouched.id)).toEqual(
    state.pagination.untouched.before,
  );
  await assertOtherDataUnchanged(world);
}
