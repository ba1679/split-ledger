import { Then, expect } from '../../support/fixtures.js';
import { assertCategoriesUnchanged } from '../../support/accounts-categories-trips.js';

Then('畫面提示分類名稱最多 30 個字且不新增分類', async ({ page, world }) => {
  await expect(page.getByRole('dialog').getByRole('alert').filter({ hasText: /分類名稱最多 30 個字/ })).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('分類名稱', { exact: true })).toHaveValue(world.get<string>('category:input'));
  await assertCategoriesUnchanged(world);
});
