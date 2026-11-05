import { When, expect } from '../../support/fixtures.js';
import { mockGoogle } from '../../support/browser.js';

When('使用者取消 Google 登入', async ({ page, world }) => {
  await mockGoogle(page, world, '甲', 'cancel');
  await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/callback/google'),
    page.getByRole('button', { name: /使用 Google 帳號登入/ }).click(),
  ]);
  await page.waitForURL(url => url.origin === world.get<string>('webOrigin') && url.pathname === '/' && url.searchParams.has('error'));
  await expect(page.getByRole('button', { name: /使用 Google 帳號登入/ })).toBeEnabled();
});
