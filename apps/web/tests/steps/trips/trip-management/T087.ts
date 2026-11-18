import { Then, expect } from '../../../support/fixtures.js';
import type { ThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';
import { managementTripId } from '../../../../../api/tests/support/trip-management/baseline.js';
import type { TripManagementSnapshot } from '../../../../../api/tests/support/trip-management/context.js';

Then('畫面預覽 {string} 並清楚標示尚未保存', async ({ world, browser }, selected: string) => {
  const draft = world.get<ThumbnailDraft>('management:draft');
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  expect(draft.name).toBe(selected);
  await expect(dialog.getByText('尚未保存', { exact: true })).toBeVisible();
  if (selected === '神社照片') {
    expect(draft.intent).toBe('save');
    const preview = dialog.locator('img[src^="blob:"]:visible');
    expect(await renderedImage(preview)).toEqual({
      width: 64,
      height: 48,
      rgba: [67, 140, 161, 255],
    });
    expect(await preview.getAttribute('src')).toBe(draft.url);
    const bytes = await page.evaluate(
      async (url) => [...new Uint8Array(await (await fetch(url)).arrayBuffer())],
      draft.url!,
    );
    expect(Buffer.from(bytes)).toEqual(draft.file!.bytes);
  } else {
    expect(selected).toBe('預設圖');
    expect(draft.intent).toBe('reset');
    await expect(dialog.getByText(/^(?:預設圖|預設旅行縮圖)$/)).toBeVisible();
    await expect(dialog.locator('img[src^="blob:"]:visible')).toHaveCount(0);
  }
  const filename = dialog.getByText(
    selected === '神社照片' ? draft.file!.name : /^(?:預設圖|預設旅行縮圖)$/,
    { exact: true },
  );
  const choose = dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ });
  const reset = dialog.getByRole('button', { name: '使用預設圖', exact: true });
  const previewArea = dialog
    .locator('img:visible, .landscape:visible, [role="img"]:visible')
    .first();

  await expect(previewArea).toBeVisible();
  await expect(filename).toBeVisible();
  await expect(choose).toBeVisible();
  await expect(reset).toBeVisible();
  const label = (await filename.boundingBox())!,
    first = (await choose.boundingBox())!,
    second = (await reset.boundingBox())!;
  const preview = (await previewArea.boundingBox())!,
    bounds = (await dialog.boundingBox())!;

  expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(8);
  expect(second.x - first.x - first.width).toBeGreaterThanOrEqual(0);
  expect(second.x - first.x - first.width).toBeLessThanOrEqual(24);
  for (const button of [first, second]) {
    expect(button.x).toBeGreaterThanOrEqual(bounds.x);
    expect(button.x + button.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(button.y).toBeGreaterThanOrEqual(preview.y + preview.height);
    expect(
      button.y >= label.y + label.height ||
        button.x >= label.x + label.width ||
        button.x + button.width <= label.x,
    ).toBe(true);
  }
  const before = world.get<TripManagementSnapshot>('management:before');
  const tripId = managementTripId(world);
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: page.viewportSize(),
  });
  try {
    await other.addCookies(await page.context().cookies());
    const list = await other.request.get('/api/trips');
    expect(list.status()).toBe(200);
    expect(
      (await list.json()).items.find((row: { id: string }) => row.id === tripId),
    ).toMatchObject({
      id: tripId,
      hasThumbnail: true,
      thumbnailRevision: String(before.trips[0]!.thumbnail_revision),
    });
    const image = await other.request.get(
      `/api/trips/${tripId}/thumbnail/${String(before.trips[0]!.thumbnail_revision)}`,
    );
    expect(image.status()).toBe(200);
    expect(await image.body()).toEqual(world.get('management:originalImage'));
    const otherPage = await other.newPage();
    await otherPage.goto('/trips');
    const card = otherPage
      .getByRole('link')
      .filter({ has: otherPage.getByRole('heading', { name: '日本旅行', exact: true }) });
    const original = await renderedImage(card.locator('img:visible'));
    expect(original.width).toBe(64);
    expect(original.height).toBe(48);
    for (const [index, value] of [109, 143, 172, 255].entries())
      expect(Math.abs(original.rgba[index]! - value)).toBeLessThanOrEqual(5);
  } finally {
    await other.close();
  }
  await assertManagementUnchanged(world);
});
