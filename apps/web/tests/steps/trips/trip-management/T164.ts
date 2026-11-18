import { Then, expect } from '../../../support/fixtures.js';
import type { CommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import type { TripManagementSnapshot } from '../../../../../api/tests/support/trip-management/context.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';

Then('返回後仍確認同一次預設圖片保存', async ({ world, browser }) => {
  const loss = world.get<CommittedResponseLoss>('management:responseLoss');
  const returned = world.get<{ tripId: string; operationId: string; verificationStart: number }>(
    'management:returnedImageVerification',
  );
  expect(world.get('management:returnedImageReceipt')).toEqual(loss.outcome);
  expect(loss.outcome!.result).toMatchObject({
    kind: 'reset_thumbnail',
    operationId: returned.operationId,
    thumbnailPresent: false,
  });
  const ui = managementUI(world),
    page = ui.page;
  await expect(
    page
      .getByText(
        /圖片已保存|已恢復預設|預設(?:圖|縮圖).*(?:成功|已保存|已確認)|原次.*已確認|已確認.*原次|操作.*已確認|結果.*已確認/,
      )
      .first(),
  ).toBeVisible();
  await waitForManagementReads(ui);
  await expect(page.getByText(/結果尚未確認|尚無法確認.*結果/)).toBeHidden();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  if (await page.getByRole('dialog').isVisible()) {
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
    await expect(dialog.locator('.landscape:visible,[role="img"]:visible').first()).toBeVisible();
  }
  const lookups = loss.verifications.slice(returned.verificationStart);
  expect(lookups.some((lookup) => lookup.operationId === returned.operationId)).toBe(true);
  for (const lookup of lookups) {
    expect(lookup.blocked).toBe(false);
    if (lookup.tripId) expect(lookup.tripId).toBe(returned.tripId);
    if (lookup.operationId) expect(lookup.operationId).toBe(returned.operationId);
  }
  const before = world.get<TripManagementSnapshot>('management:before');
  const oldPath = `/api/trips/${returned.tripId}/thumbnail/${before.trips[0]!.thumbnail_revision}`;
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport:
      page.viewportSize()!.width < 600 ? { width: 1440, height: 900 } : { width: 390, height: 844 },
  });
  try {
    await other.addCookies(await page.context().cookies());
    const trip = await other.request.get(`/api/trips/${returned.tripId}`);
    expect(trip.status()).toBe(200);
    expect(await trip.json()).toMatchObject({
      id: returned.tripId,
      hasThumbnail: false,
      thumbnailRevision: String(loss.after!.trips[0]!.thumbnail_revision),
    });
    const old = await other.request.get(oldPath);
    expect(old.status()).toBe(404);
    expect(await old.json()).toMatchObject({ code: 'NOT_FOUND' });
    const view = await other.newPage();
    await view.goto('/trips');
    const card = view
      .getByRole('link')
      .filter({ has: view.getByRole('heading', { name: '日本旅行', exact: true }) });
    await expect(card).toHaveAttribute('href', `/trips/${returned.tripId}`);
    await expect(card.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
    await expect(card.locator('.landscape:visible,[role="img"]:visible').first()).toBeVisible();
  } finally {
    await other.close();
  }
  const receipt = await ownerRead(
    world,
    `/api/trips/${returned.tripId}/operations/${returned.operationId}`,
  );
  expect(receipt.status()).toBe(200);
  expect(await receipt.json()).toEqual(loss.outcome);
  expect(loss.mutations.length).toBe(1);
  expect(loss.mutations[0]!.method).toBe('DELETE');
  expect(ui.writes.length).toBe(1);
  expect(await managementSnapshot(world)).toEqual(loss.after);
  await assertOtherDataUnchanged(world);
});
