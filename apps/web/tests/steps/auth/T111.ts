import { Given, expect } from '../../support/fixtures.js';
import { seedIdentity, seedTrip, seedCategory } from '../../support/accounts-categories-trips.js';

Given('使用者尚未登入', async ({ page, world }) => {
  await seedIdentity(world);
  await seedTrip(world, '日本旅行'); await seedCategory(world, '餐飲');
  await seedTrip(world, '他人的旅行', '乙'); await seedCategory(world, '他人的分類', '乙');
  await page.context().clearCookies();
  await page.goto('/');
  expect((await page.request.get('/api/me')).status()).toBe(401);
  await expect(page.getByRole('button', { name: /使用 Google 帳號登入/ })).toBeVisible();
});
