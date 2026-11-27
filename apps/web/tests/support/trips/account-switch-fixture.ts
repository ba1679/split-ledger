import { goToTripList, tripEditor } from '../home-navigation.js';
import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import {
  arrangeManagementPage,
  managementUI,
  waitForManagementReads,
} from './management-fixture.js';
import { selectThumbnailDraft, type ThumbnailDraft } from '../thumbnail/draft-fixture.js';
import { renderedImage } from '../thumbnail/rendered-image.js';
import { objectUrls } from '../thumbnail/object-urls.js';
import { deferOwnerRead } from '../loading/deferred-owner-read.js';

export async function arrangeAccountSwitch(page: Page, world: LedgerWorld): Promise<void> {
  const navigateTrips = async (trash = false) => {
    await goToTripList(page);
    if (trash)
      await page.locator('main').getByRole('link', { name: '垃圾桶', exact: true }).click();
  };
  await arrangeManagementPage(page, world, '帳本');
  const activeId = managementTripId(world),
    trashId = world.tripManagement.ids.trips.get('台南旅行')!,
    carolId = world.tripManagement.ids.trips.get('私人旅行')!;
  await world.db.query(
    'UPDATE trips SET deleted_at=now(),lifecycle_revision=lifecycle_revision+1 WHERE id=$1',
    [trashId],
  );
  world.set('management:sharedBefore', await sharedSnapshot(world));
  // All navigation stays in one SPA so the old account has genuine cached projections.
  await navigateTrips();
  const activeCard = page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: '日本旅行', exact: true }) });
  await renderedImage(activeCard.locator('img:visible'));
  const activeUrl = await activeCard.locator('img:visible').getAttribute('src');
  await navigateTrips(true);
  await expect(page.getByRole('heading', { name: /垃圾桶/ })).toBeVisible();
  await expect(page.getByText('台南旅行', { exact: true })).toBeVisible();
  const trashImage = page.locator(`img[src*="/trips/trash/${trashId}/thumbnail/"]:visible`);
  await renderedImage(trashImage);
  const trashUrl = await trashImage.getAttribute('src');
  await waitForManagementReads(managementUI(world));
  await navigateTrips();
  await expect(activeCard).toBeVisible();
  await waitForManagementReads(managementUI(world));
  const deferred = deferOwnerRead(world, activeId);
  await activeCard.click();
  // The earlier authoritative trip remains visible while a native revalidation is held.
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  await expect.poll(() => deferred.arrived).toBe(true);
  expect(deferred.finished).toBe(false);
  await goToTripList(page);
  await tripEditor(page).click();
  await page.getByRole('menuitem', { name: '更換縮圖', exact: true }).click();
  await selectThumbnailDraft(world, '神社照片');
  const draft = world.get<ThumbnailDraft>('management:draft');
  const urls = await objectUrls(page);
  expect(urls.some((row) => row.url === draft.url && !row.revoked)).toBe(true);
  const snapshots = await Promise.all(
    [activeId, trashId, carolId].map(async (id) => ({
      id,
      snapshot: await managementSnapshot(world, id),
    })),
  );
  expect(managementUI(world).writes.length).toBe(0);
  world.set('management:accountSwitch', {
    activeId,
    trashId,
    carolId,
    activeUrl,
    trashUrl,
    draftUrl: draft.url!,
    draftName: draft.file!.name,
    urls,
    snapshots,
    deferred,
  });
}
