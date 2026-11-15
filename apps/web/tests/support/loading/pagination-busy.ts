import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  expenseRows,
  visibleExpenseIds,
  assertPaginationDataUnchanged,
  type PaginationRead,
} from './pagination-fixture.js';
import { assertSpinnerOnly } from './spinner-result.js';
import { managementUI } from '../trips/management-fixture.js';

export async function assertPaginationBusy(world: LedgerWorld): Promise<void> {
  const state = world.get<PaginationRead>('loading:pagination'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.requests.length).toBe(1);
  expect(state.requests[0]!.failure()).toBeNull();
  expect(state.arrived).toBe(1);
  expect(state.finished).toBe(0);
  expect(state.released).toBe(false);
  const rows = expenseRows(page, state.tripId);
  await expect(rows).toHaveCount(20);
  await expect(page.getByText(/^(?:共\s*)?0\s*筆(?:紀錄|支出)?$/)).toHaveCount(0);
  expect(await visibleExpenseIds(page, state.tripId)).toEqual(
    state.first.items.map((expense) => expense.id),
  );
  expect(await rows.allTextContents()).toEqual(state.originalRows);
  for (const row of await rows.all()) await expect(row).toBeVisible();
  const totals = page.getByRole('region', { name: '分幣別總額', exact: true });
  await expect(totals).toBeVisible();
  await expect(totals).toHaveText(state.totalsText);
  await expect(totals).not.toHaveAttribute('aria-busy', 'true');
  await expect(
    page.locator('[data-skeleton]:visible, .skeleton:visible, .query-skeleton:visible'),
  ).toHaveCount(0);
  await expect(state.control).toHaveAccessibleName('載入更多');
  await expect(state.control).toHaveAttribute('aria-busy', 'true');
  await assertSpinnerOnly(state.control.locator('[role="status"]'), /載入更多|讀取更多|下一頁/);
  expect(await state.control.innerText()).not.toMatch(/載入中|處理中|等待|\d+%/);
  for (const busy of await page.locator('[aria-busy="true"]').all())
    expect(
      await busy.evaluate((element) => element.closest('.load-more') !== null),
      'Busy feedback must remain inside the list tail',
    ).toBe(true);
  const box = await state.control.boundingBox();
  expect(box).not.toBeNull();
  for (const dimension of ['width', 'height'] as const)
    expect(Math.abs(box![dimension] - state.box![dimension])).toBeLessThanOrEqual(1);
  const painted = await rows.evaluateAll((elements) =>
    elements
      .map((element) => {
        const box = element.getBoundingClientRect(),
          y = box.y + box.height / 2,
          x = box.x + box.width / 2;
        if (y <= 0 || y >= innerHeight || x <= 0 || x >= innerWidth) return null;
        const hit = document.elementFromPoint(x, y);

        return hit !== null && element.contains(hit);
      })
      .filter((value) => value !== null),
  );
  expect(
    painted.length,
    'At least one already-loaded row must remain exposed near the tail',
  ).toBeGreaterThan(0);
  expect(painted.every(Boolean), 'A page-wide busy overlay must not cover retained rows').toBe(
    true,
  );
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
  await assertPaginationDataUnchanged(world);
}
