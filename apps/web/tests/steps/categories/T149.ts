import { Then, expect } from '../../support/fixtures.js';
import { assertCategoriesUnchanged } from '../../support/accounts-categories-trips.js';

Then('畫面提示已有相同名稱且原分類維持不變', async ({ page, world }) => {
  await expect(page.getByRole('dialog').getByRole('alert').filter({ hasText: /已有相同名稱/ })).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('分類名稱', { exact: true })).toHaveValue('food');
  await assertCategoriesUnchanged(world);
});
