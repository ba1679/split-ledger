import { Then, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { observedLifecycleCommand } from '../../../support/trips/browser-command.js';
import { assertLifecycleTransition } from '../../../../../api/tests/support/trip-management/lifecycle-result.js';
import {
  assertPreservedTrip,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../../api/tests/support/trip-management/baseline.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';

Then('復原後原旅行重新可開啟且垃圾桶移除該項', async ({ world, browser }) => {
  const { response, command } = await observedLifecycleCommand(world, 'restore');

  await assertLifecycleTransition(world, 'active', response, command);
  await assertPreservedTrip(world, response);
  const ui = managementUI(world),
    tripId = managementTripId(world);
  const { page } = ui;

  await expect(page).toHaveURL(/\/trips\/trash$/);
  await waitForManagementReads(ui);
  await expect(page.getByText('日本旅行', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /復原/ })).toBeVisible();
  // A fresh browser context has no account query cache or image cache from the first device.
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: page.viewportSize(),
  });
  try {
    await other.addCookies(await page.context().cookies());
    const state = await other.request.get(`/api/trips/${tripId}/state`);

    expect(state.status()).toBe(200);
    expect(await state.json()).toEqual(expectedCurrentState(await managementSnapshot(world)));
    const active = await other.request.get('/api/trips');
    const trash = await other.request.get('/api/trips/trash');

    expect(active.status()).toBe(200);
    expect(trash.status()).toBe(200);
    expect(
      (await active.json()).items.filter((row: { id: string }) => row.id === tripId),
    ).toHaveLength(1);
    expect((await trash.json()).items.some((row: { id: string }) => row.id === tripId)).toBe(false);
    const secondPage = await other.newPage();

    await secondPage.goto(`/trips/${tripId}`);
    await expect(secondPage.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    await expect(secondPage.getByText('晚餐', { exact: true })).toBeVisible();
    await expect(secondPage.getByRole('link', { name: '記一筆', exact: true })).toBeVisible();
    const snapshot = await managementSnapshot(world);
    const image = await other.request.get(
      `/api/trips/${tripId}/thumbnail/${String(snapshot.trips[0]!.thumbnail_revision)}`,
    );

    expect(image.status()).toBe(200);
    expect(await image.body()).toEqual(world.get('management:originalImage'));
    expect(await managementSnapshot(world)).toEqual(snapshot);
  } finally {
    await other.close();
  }
  expect(ui.writes).toHaveLength(1);
  await assertOtherDataUnchanged(world);
});
