import { When, expect } from '../../support/fixtures.js';
import { assertAccount } from '../../support/accounts-categories-trips.js';
import { mockGoogle } from '../../support/browser.js';

When('使用者完成 Google 登入', async ({ page, world }) => {
  await mockGoogle(page, world, '甲', 'success');
  await Promise.all([
    page.waitForRequest(request => request.url().startsWith('https://accounts.google.com/')),
    page.getByRole('button', { name: /使用 Google 帳號登入/ }).click(),
  ]);
  await expect(page).toHaveURL(/\/trips(?:[?#].*)?$/);
  await assertAccount(page, world, '甲');
});
