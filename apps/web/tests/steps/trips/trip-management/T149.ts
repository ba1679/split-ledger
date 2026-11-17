import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import type { ThumbnailConflict } from '../../../support/thumbnail/conflict-fixture.js';
import type { observedThumbnailCommand } from '../../../support/thumbnail/browser-command.js';
import type { ThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';

Then('畫面說明衝突並保留目前權威狀態', async ({ world, browser }) => {
  const conflict = world.get<ThumbnailConflict>('management:thumbnailConflict');
  const saved = world.get<Awaited<ReturnType<typeof observedThumbnailCommand>>>(
    'management:conflictRejected',
  );
  const { current } = conflict,
    tripId = saved.command.tripId;
  const before = world.get<TripManagementSnapshot>('management:before');
  const code = conflict.conflict === '圖片版本' ? 'THUMBNAIL_UPDATED' : 'TRIP_STATE_CHANGED';
  expect(await saved.response.json()).toMatchObject({
    code,
    message: expect.any(String),
  });
  const ui = managementUI(world),
    page = ui.page;
  await expect
    .poll(
      () =>
        ui.reads
          .slice(conflict.readsStart)
          .filter((request) => new URL(request.url()).pathname === `/api/trips/${tripId}/state`)
          .length,
    )
    .toBeGreaterThan(0);
  await waitForManagementReads(ui);
  const reads = ui.reads
    .slice(conflict.readsStart)
    .filter((request) => new URL(request.url()).pathname === `/api/trips/${tripId}/state`);
  const response = await reads.at(-1)!.response();
  expect(response?.status()).toBe(200);
  expect(await response!.finished()).toBeNull();
  expect(await response!.json()).toEqual(expectedCurrentState(current));
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const alert = dialog.getByRole('alert').filter({ hasText: /\S/ }).first();
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(
    conflict.conflict === '圖片版本'
      ? /圖片.*(?:更新|變更)|其他裝置|最新圖片/
      : /旅行.*(?:更新|變更)|其他裝置|重新確認/,
  );
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const visible = await page.locator('body').innerText();
  for (const forbidden of [code, tripId, saved.command.operationId])
    expect(visible).not.toContain(forbidden);
  const draft = world.get<ThumbnailDraft>('management:draft');
  await expect(dialog.getByText(draft.file!.name, { exact: true })).toBeVisible();
  const preview = dialog.locator('img[src^="blob:"]:visible');
  expect(await renderedImage(preview)).toEqual({
    width: 64,
    height: 48,
    rgba: [67, 140, 161, 255],
  });
  const hash = await preview.evaluate(async (element) => {
    const bytes = await (await fetch((element as HTMLImageElement).src)).arrayBuffer();

    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  });
  expect(hash).toBe(draft.file!.asset.sha256);
  const receipt = await ownerRead(
    world,
    `/api/trips/${tripId}/operations/${saved.command.operationId}`,
  );
  expect(receipt.status()).toBe(404);
  const stable = (row: Record<string, unknown>) => {
    const {
      lifecycle_revision: _lifecycle,
      thumbnail_revision: _thumbnail,
      updated_at: _updated,
      ...rest
    } = row;

    return rest;
  };
  expect(stable(current.trips[0]!)).toEqual(stable(before.trips[0]!));
  expect(
    current.receipts.filter((row) => !conflict.otherOperations.includes(String(row.operation_id))),
  ).toEqual(before.receipts);
  expect(current.receipts.length).toBe(before.receipts.length + conflict.otherOperations.length);
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport:
      page.viewportSize()!.width < 600 ? { width: 1440, height: 900 } : { width: 390, height: 844 },
  });
  try {
    await other.addCookies(await page.context().cookies());
    const image = await other.request.get(
      `/api/trips/${tripId}/thumbnail/${current.trips[0]!.thumbnail_revision}`,
    );
    expect(image.status()).toBe(200);
    expect(await image.body()).toEqual(current.thumbnails[0]!.image_webp);
    const view = await other.newPage();
    await view.goto('/trips');
    const card = view
      .getByRole('link')
      .filter({ has: view.getByRole('heading', { name: '日本旅行', exact: true }) });
    const actual = await renderedImage(card.locator('img:visible'));
    expect(actual.width).toBe(Number(current.thumbnails[0]!.width));
    expect(actual.height).toBe(Number(current.thumbnails[0]!.height));
    const rgba = conflict.conflict === '圖片版本' ? [45, 115, 189, 255] : [109, 143, 172, 255];
    for (const [index, value] of rgba.entries())
      expect(Math.abs(actual.rgba[index]! - value)).toBeLessThanOrEqual(5);
  } finally {
    await other.close();
  }
  expect(ui.writes.length).toBe(1);
  expect(await managementSnapshot(world)).toEqual(current);
  await assertOtherDataUnchanged(world);
});
