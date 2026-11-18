import { expect, type Browser, type BrowserContext } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { assertThumbnailSaved } from '../../../../api/tests/support/trip-management/thumbnail-result.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import type { observedThumbnailCommand } from './browser-command.js';
import { renderedImage } from './rendered-image.js';
import { objectUrls, assertDraftUrlsReleased } from './object-urls.js';
import type { ThumbnailDraft } from './draft-fixture.js';

export async function assertPreparedThumbnail(
  world: LedgerWorld,
  browser: Browser,
  supplied?: BrowserContext,
): Promise<void> {
  const saved = world.get<Awaited<ReturnType<typeof observedThumbnailCommand>>>(
    'management:preparedThumbnailSaved',
  );
  const ui = managementUI(world),
    page = ui.page;
  await waitForManagementReads(ui);
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await assertThumbnailSaved(world, saved.response);
  const after = await managementSnapshot(world),
    tripId = saved.command.tripId;
  const revision = String(after.trips[0]!.thumbnail_revision);
  const current = world.get<ThumbnailDraft>('management:draft');
  await expect
    .poll(
      async () =>
        (await objectUrls(page))
          .filter((record) => record.url !== current.url)
          .every((record) => record.revoked),
      { message: 'Discarded selection URLs must be released by native cleanup effects' },
    )
    .toBe(true);
  if (!(await page.getByRole('dialog').isVisible())) await assertDraftUrlsReleased(page);
  const remote = page.locator(`img:visible[src*="/trips/${tripId}/thumbnail/"]`);
  for (const image of await remote.all())
    await expect(image).toHaveAttribute('src', new RegExp(`/thumbnail/${revision}(?:\\?|$)`));
  const other =
    supplied ??
    (await browser.newContext({
      baseURL: world.get<string>('webOrigin'),
      viewport:
        page.viewportSize()!.width < 600
          ? { width: 1440, height: 900 }
          : { width: 390, height: 844 },
    }));
  try {
    await other.addCookies(await page.context().cookies());
    const response = await other.request.get(`/api/trips/${tripId}/thumbnail/${revision}`);
    expect(response.status()).toBe(200);
    expect(await response.body()).toEqual(after.thumbnails[0]!.image_webp);
    const view = await other.newPage();
    await view.goto('/trips');
    const card = view
      .getByRole('link')
      .filter({ has: view.getByRole('heading', { name: '日本旅行', exact: true }) });
    await expect(card).toHaveAttribute('href', `/trips/${tripId}`);
    const image = card.locator('img:visible');
    await expect(image).toHaveAttribute('src', new RegExp(`/thumbnail/${revision}(?:\\?|$)`));
    const actual = await renderedImage(image);
    expect(actual.width).toBe(Number(after.thumbnails[0]!.width));
    expect(actual.height).toBe(Number(after.thumbnails[0]!.height));
    expect(actual.width).toBeLessThanOrEqual(1200);
    expect(actual.height).toBeLessThanOrEqual(1200);
    expect(actual.width / actual.height).toBeCloseTo(4 / 3, 2);
    for (const [index, value] of [67, 140, 161, 255].entries())
      expect(Math.abs(actual.rgba[index]! - value)).toBeLessThanOrEqual(5);
  } finally {
    if (!supplied) await other.close();
  }
  expect(ui.writes.length).toBe(saved.start + 1);
  expect(
    ui.writes.filter(
      (request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/trips',
    ).length,
  ).toBe(0);
  expect(await managementSnapshot(world)).toEqual(after);
  await assertOtherDataUnchanged(world);
}
