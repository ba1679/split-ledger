import { Then, expect } from '../../../support/fixtures.js';
import { observedThumbnailCommand } from '../../../support/thumbnail/browser-command.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';
import { assertThumbnailSaved } from '../../../../../api/tests/support/trip-management/thumbnail-result.js';
import { assertThumbnailReset } from '../../../../../api/tests/support/trip-management/thumbnail-reset-result.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../../api/tests/support/trip-management/preservation.js';

Then('最後預覽的 {string} 成為已保存縮圖', async ({ world, browser }, selected: string) => {
  const { response, command, start } = await observedThumbnailCommand(world, selected);

  expect(response.status()).toBe(200);
  if (selected === '神社照片') await assertThumbnailSaved(world, response);
  else {
    expect(selected).toBe('預設圖');
    await assertThumbnailReset(world, response, command);
  }
  const receipt = await ownerRead(
    world,
    `/api/trips/${command.tripId}/operations/${command.operationId}`,
  );

  expect(receipt.status()).toBe(200);
  expect(await receipt.json()).toEqual(await response.json());
  const after = await managementSnapshot(world);
  const revision = String(after.trips[0]!.thumbnail_revision);
  const { page } = managementUI(world);
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: page.viewportSize(),
  });
  try {
    await other.addCookies(await page.context().cookies());
    const current = await other.request.get(`/api/trips/${command.tripId}`);
    expect(current.status()).toBe(200);
    expect(await current.json()).toMatchObject({
      id: command.tripId,
      hasThumbnail: selected === '神社照片',
      thumbnailRevision: revision,
    });
    const image = await other.request.get(`/api/trips/${command.tripId}/thumbnail/${revision}`);
    if (selected === '神社照片') {
      expect(image.status()).toBe(200);
      expect(await image.body()).toEqual(after.thumbnails[0]!.image_webp);
    } else {
      expect(image.status()).toBe(404);
      expect(await image.json()).toMatchObject({ code: 'NOT_FOUND' });
    }
    const otherPage = await other.newPage();
    await otherPage.goto('/trips');
    const card = otherPage
      .getByRole('link')
      .filter({ has: otherPage.getByRole('heading', { name: '日本旅行', exact: true }) });
    await expect(card).toBeVisible();
    if (selected === '神社照片') {
      const rendered = await renderedImage(card.locator('img:visible'));
      expect(rendered.width).toBe(64);
      expect(rendered.height).toBe(48);
      for (const [index, value] of [67, 140, 161, 255].entries())
        expect(Math.abs(rendered.rgba[index]! - value)).toBeLessThanOrEqual(5);
    } else {
      await expect(card.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
      await expect(
        card.locator('.landscape:visible,[role="img"]:visible,img:visible').first(),
      ).toBeVisible();
    }
  } finally {
    await other.close();
  }
  expect(managementUI(world).writes.slice(start)).toHaveLength(1);
  if (world.state.has('management:previousImageFailureCleared')) {
    await waitForManagementReads(managementUI(world));
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  }
  expect(await managementSnapshot(world)).toEqual(after);
  await assertOtherDataUnchanged(world);
});
