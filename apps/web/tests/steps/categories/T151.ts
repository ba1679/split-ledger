import { Then, expect } from '../../support/fixtures.js';
import { rows, named, assertCategoriesUnchanged, assertExpensesUnchanged } from '../../support/accounts-categories-trips.js';

Then('畫面說明分類仍在使用且支出分類維持不變', async ({ page, world }) => {
  await expect(page.getByRole('dialog').getByText(/仍.*使用|仍用於|暫時不能刪除/).first()).toBeVisible();
  await assertCategoriesUnchanged(world); await assertExpensesUnchanged(world);
  const category = await named(world, 'categories', '吃喝');
  expect((await rows(world, 'expenses')).every(row => row.category_id === category.id)).toBe(true);
});
