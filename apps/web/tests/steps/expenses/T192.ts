import { Then, expect } from '../../support/fixtures.js';
import { expenseLink, readLedger, unchanged, assertDraft } from '../../support/expense-helpers.js';

Then('畫面保留草稿並告知支出尚未保存', async ({ page, world }) => {
  await expect(page.getByText(/尚未保存/)).toBeVisible();
  await assertDraft(page, world);
  await unchanged(world);
  expect(world.get<unknown[]>('expense:posts')).toEqual([]);
  await page.context().setOffline(false);
  await readLedger(world);
  await expect(expenseLink(page, '午餐')).toHaveCount(0);
});
