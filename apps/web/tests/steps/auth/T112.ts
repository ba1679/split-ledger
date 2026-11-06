import { Then, expect } from '../../support/fixtures.js';
import { assertAccount } from '../../support/accounts-categories-trips.js';

Then('使用者看到自己的旅行清單', async ({ page, world }) => {
  await assertAccount(page, world, '甲');
  await expect(page.getByRole('link').filter({ hasText: '日本旅行' })).toBeVisible();
  await expect(page.getByText('他人的旅行', { exact: true })).toHaveCount(0);
  await expect(page.getByText('他人的分類', { exact: true })).toHaveCount(0);
});
