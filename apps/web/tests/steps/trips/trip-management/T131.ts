import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { mockGoogle } from '../../../support/browser.js';
import { objectUrls } from '../../../support/thumbnail/object-urls.js';
import type { DeferredOwnerRead } from '../../../support/loading/deferred-owner-read.js';

When('Alice 登出並切換為 Carol 帳號', async ({ world }) => {
  const { page } = managementUI(world);
  const state = world.get<{ deferred: DeferredOwnerRead; draftUrl: string }>(
    'management:accountSwitch',
  );
  expect(state.deferred.arrived).toBe(true);
  expect(state.deferred.finished).toBe(false);
  // End the actual local session while the unsubmitted preview is still mounted.
  // Escape would discard it before the account boundary and mask logout cleanup.
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await objectUrls(page)).find((row) => row.url === state.draftUrl)).toMatchObject({
    revoked: false,
  });
  expect(await page.evaluate(async (url) => (await fetch(url)).ok, state.draftUrl)).toBe(true);
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    await response.text();

    return response.status;
  });
  expect(status).toBe(200);
  const expired = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/me' &&
      response.status() === 401,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  expect(await (await expired).finished()).toBeNull();
  await expect(page.getByRole('button', { name: /使用 Google 帳號登入/ })).toBeVisible();
  expect((await page.request.get('/api/me')).status()).toBe(401);
  await expect
    .poll(async () => (await objectUrls(page)).find((row) => row.url === state.draftUrl)?.revoked)
    .toBe(true);
  const urlsAtSignOut = await objectUrls(page);
  const oldBlobReadable = await page.evaluate(async (url) => {
    try {
      const response = await fetch(url);

      return response.ok;
    } catch {
      return false;
    }
  }, state.draftUrl);
  world.set('management:accountSwitchBoundary', {
    urlsAtSignOut,
    oldBlobReadable,
    text: await page.locator('body').innerText(),
  });
  await mockGoogle(page, world, 'Carol', 'success');
  await Promise.all([
    page.waitForRequest((request) => request.url().startsWith('https://accounts.google.com/')),
    page.getByRole('button', { name: /使用 Google 帳號登入/ }).click(),
  ]);
  await expect(page).toHaveURL(/\/trips(?:[?#].*)?$/);
  const me = await page.request.get('/api/me');
  expect(me.status()).toBe(200);
  expect(await me.json()).toMatchObject({ id: world.users.get('Carol')!.id, name: 'Carol' });
  state.deferred.release();
  await expect.poll(() => state.deferred.finished).toBe(true);
  expect(state.deferred.error).toBeUndefined();
  world.set('management:accountSwitched', true);
});
