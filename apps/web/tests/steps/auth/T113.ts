import { openAppSettings } from '../../support/home-navigation.js';
import { Then, expect } from '../../support/fixtures.js';
import { assertAccount } from '../../support/accounts-categories-trips.js';

Then('畫面只顯示第二個帳號的旅行與分類', async ({ page, world }) => {
  await assertAccount(page, world, '乙');
  await expect(page.getByRole('link').filter({ hasText: '第二帳號旅行' })).toBeVisible();
  await expect(page.getByText('第一帳號旅行', { exact: true })).toHaveCount(0);
  const settings = await openAppSettings(page);
  await settings.getByRole('link', { name: '支出分類', exact: true }).click();
  await expect(page.getByText('第二帳號分類', { exact: true })).toBeVisible();
  await expect(page.getByText('第一帳號分類', { exact: true })).toHaveCount(0);
  await assertAccount(page, world, '乙');
});
