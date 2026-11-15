import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import type { ObjectUrlRecord } from '../../../support/thumbnail/object-urls.js';
import type { DeferredOwnerRead } from '../../../support/loading/deferred-owner-read.js';

Then('Carol 畫面只含自己的資料且舊預覽已釋放', async ({ world }) => {
  expect(world.get('management:accountSwitched')).toBe(true);
  const ui = managementUI(world),
    page = ui.page;
  const state = world.get<{
    activeId: string;
    trashId: string;
    carolId: string;
    activeUrl: string;
    trashUrl: string;
    draftUrl: string;
    draftName: string;
    snapshots: { id: string; snapshot: TripManagementSnapshot }[];
    deferred: DeferredOwnerRead;
  }>('management:accountSwitch');
  const boundary = world.get<{
    urlsAtSignOut: ObjectUrlRecord[];
    oldBlobReadable: boolean;
    text: string;
  }>('management:accountSwitchBoundary');
  expect(boundary.urlsAtSignOut.find((row) => row.url === state.draftUrl)).toMatchObject({
    revoked: true,
  });
  expect(boundary.urlsAtSignOut.every((row) => row.revoked)).toBe(true);
  expect(boundary.oldBlobReadable).toBe(false);
  expect(boundary.text).not.toMatch(/日本旅行|台南旅行|神社照片|Alice/);
  expect(state.deferred.arrived).toBe(true);
  expect(state.deferred.finished).toBe(true);
  expect(state.deferred.body).toMatchObject({ id: state.activeId, name: '日本旅行' });
  await waitForManagementReads(ui);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const card = page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: '私人旅行', exact: true }) });
  await expect(card).toHaveAttribute('href', `/trips/${state.carolId}`);
  // Carol's existing fixture is active with the default landscape, not a custom photo.
  expect(state.snapshots.find((saved) => saved.id === state.carolId)!.snapshot.thumbnails).toEqual(
    [],
  );
  await expect(card.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
  await expect(card.locator('.landscape:visible,[role="img"]:visible').first()).toBeVisible();
  const text = await page.locator('body').innerText();
  for (const forbidden of ['日本旅行', '台南旅行', 'Alice', state.draftName])
    expect(text).not.toContain(forbidden);
  await expect(
    page.locator(
      `img[src*="${state.activeId}"],img[src*="${state.trashId}"],img[src="${state.draftUrl}"]`,
    ),
  ).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const active = await page.request.get('/api/trips?limit=100'),
    trash = await page.request.get('/api/trips/trash?limit=100');
  expect(active.status()).toBe(200);
  expect(trash.status()).toBe(200);
  expect((await active.json()).items.map((row: { id: string }) => row.id)).toEqual([state.carolId]);
  expect((await trash.json()).items).toEqual([]);
  // Native browser fetch exercises the current session AND its existing HTTP cache.
  for (const url of [
    state.activeUrl,
    state.trashUrl,
    `/api/trips/${state.activeId}`,
    `/api/trips/${state.activeId}/state`,
    `/api/trips/${state.trashId}/state`,
  ]) {
    const result = await page.evaluate(async (url) => {
      const response = await fetch(url, { credentials: 'same-origin', cache: 'default' });

      return {
        status: response.status,
        json: response.headers.get('content-type')?.includes('application/json')
          ? await response.json()
          : null,
      };
    }, url);
    expect(result.status).toBe(404);
    expect(result.json).toMatchObject({ code: 'NOT_FOUND', message: expect.any(String) });
    expect(Object.keys(result.json).sort()).toEqual(['code', 'message']);
  }
  expect(
    await page.evaluate(async (url) => {
      try {
        return (await fetch(url)).ok;
      } catch {
        return false;
      }
    }, state.draftUrl),
  ).toBe(false);
  for (const saved of state.snapshots)
    expect(await managementSnapshot(world, saved.id)).toEqual(saved.snapshot);
  expect(
    ui.writes.filter((request) => /^\/api\/trips(?:\/|$)/.test(new URL(request.url()).pathname))
      .length,
  ).toBe(0);
});
