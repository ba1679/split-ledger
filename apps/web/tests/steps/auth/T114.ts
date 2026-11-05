import { When, expect } from '../../support/fixtures.js';
import { assertAccount } from '../../support/accounts-categories-trips.js';
import { mockGoogle } from '../../support/browser.js';

When('第二個帳號完成 Google 登入', async ({ page, world }) => {
  await page.getByRole('button', { name: '登出', exact: true }).first().click();
  await expect(page.getByRole('button', { name: /使用 Google 帳號登入/ })).toBeVisible();
  expect((await page.request.get('/api/me')).status()).toBe(401);
  await mockGoogle(page, world, '乙', 'success');
  await Promise.all([
    page.waitForRequest(request => request.url().startsWith('https://accounts.google.com/')),
    page.getByRole('button', { name: /使用 Google 帳號登入/ }).click(),
  ]);
  await expect(page).toHaveURL(/\/trips(?:[?#].*)?$/);
  await assertAccount(page, world, '乙');
});
