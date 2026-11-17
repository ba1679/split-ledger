import { Then, expect } from '../../../support/fixtures.js';
import { assertSnackDraft, type StaleExpenseDraft } from '../../../support/expenses/stale-draft.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';

Then('舊表單說明垃圾桶狀態並提供復原下一步', async ({ world }) => {
  const state = world.get<StaleExpenseDraft>('expense:staleDraft');
  const ui = managementUI(world),
    page = ui.page;
  await expect(
    page
      .getByRole('main')
      .getByText(/旅行[^。]*垃圾桶/)
      .first(),
  ).toBeVisible();
  const next = page.getByRole('main').getByRole('link', { name: /垃圾桶|復原/ });
  await expect(next).toHaveAttribute('href', '/trips/trash');
  await next.click({ trial: true });
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: /點心.*已(?:保存|儲存)|(?:保存|儲存)成功/ }),
  ).toBeHidden();
  // The still-unsubmitted form must retain all fields even when business actions are locked.
  await assertSnackDraft(page, state.draft);
  await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeDisabled();
  for (const control of await page.getByRole('button', { name: /^(刪除支出|確認刪除)$/ }).all())
    if (await control.isVisible()) await expect(control).toBeDisabled();
  await expect(page.getByRole('link', { name: '記一筆', exact: true })).toBeHidden();
  await expect(page.getByRole('region', { name: '成員淨額', exact: true })).toBeHidden();
  expect(ui.writes.length).toBe(1);
  const statePath = `/api/trips/${state.tripId}/state`;
  const reads = ui.reads.slice(state.readStart!);
  expect(reads.length).toBeGreaterThan(0);
  expect(reads.every((read) => new URL(read.url()).pathname === statePath)).toBe(true);
  const authority = await ownerRead(world, statePath);
  expect(authority.status()).toBe(200);
  expect(await authority.json()).toEqual(expectedCurrentState(state.trashed));
  const after = await managementSnapshot(world);
  expect(after).toEqual(state.trashed);
  expect(after.expenses.some((row) => row.item === '點心')).toBe(false);
  // Whole snapshots include expense shares, payment sources and accounting revisions.
  await assertOtherDataUnchanged(world);
});
