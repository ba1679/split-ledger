import { openAppSettings } from '../../support/home-navigation.js';
import { Given, expect } from '../../support/fixtures.js';
import {
  seedTrip,
  seedCategory,
  login,
  assertAccount,
} from '../../support/accounts-categories-trips.js';

Given('裝置曾顯示第一個帳號的旅行與分類', async ({ page, world }) => {
  await seedTrip(world, '第一帳號旅行');
  await seedCategory(world, '第一帳號分類');
  await seedTrip(world, '第二帳號旅行', '乙');
  await seedCategory(world, '第二帳號分類', '乙');
  await login(page, world);
  await page.goto('/trips');
  await expect(page.getByRole('link').filter({ hasText: '第一帳號旅行' })).toBeVisible();
  const settings = await openAppSettings(page);
  await settings.getByRole('link', { name: '支出分類', exact: true }).click();
  await expect(page.getByText('第一帳號分類', { exact: true })).toBeVisible();
  await assertAccount(page, world, '甲');
});
