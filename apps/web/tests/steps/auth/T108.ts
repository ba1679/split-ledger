import { Then, expect } from '../../support/fixtures.js';

Then('使用者仍停留在登入入口且看不到帳本資料', async ({ page }) => {
  await expect(page.getByRole('button', { name: /使用 Google 帳號登入/ })).toBeVisible();
  for (const path of ['/api/me', '/api/trips', '/api/categories']) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(401);
  }
  for (const name of ['日本旅行', '他人的旅行', '餐飲', '他人的分類']) await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});
