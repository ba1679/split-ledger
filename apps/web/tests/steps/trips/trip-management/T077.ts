import { Then, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { observedLifecycleCommand } from '../../../support/trips/browser-command.js';
import { assertNoCachedLedgerOnBack } from '../../../support/trips/history-cache.js';
import {
  assertLifecycleTransition,
  ownerTripPages,
} from '../../../../../api/tests/support/trip-management/lifecycle-result.js';
import {
  assertPreservedTrip,
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { managementTripId } from '../../../../../api/tests/support/trip-management/baseline.js';

Then('移入成功回到一般清單並更新相關入口', async ({ world }) => {
  const { response, command } = await observedLifecycleCommand(world, 'trash');

  await assertLifecycleTransition(world, 'trash', response, command);
  await assertPreservedTrip(world, response);
  const ui = managementUI(world),
    tripId = managementTripId(world);
  const { page } = ui;

  await expect(page).toHaveURL(/\/trips$/);
  await waitForManagementReads(ui);
  await expect(page.getByRole('link', { name: /日本旅行/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '台南旅行', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /移.*垃圾桶/ })).toBeVisible();
  await expect(page.getByRole('link', { name: '記一筆', exact: true })).toHaveCount(0);
  expect((await ownerTripPages(world, 'trash')).find((row) => row.id === tripId)).toMatchObject({
    id: tripId,
    name: '日本旅行',
    hasThumbnail: true,
  });
  const image = await ownerRead(
    world,
    `/api/trips/trash/${tripId}/thumbnail/${world.tripManagement.versions.get(tripId)!.thumbnail}`,
  );

  expect(image.status()).toBe(200);
  expect(await image.body()).toEqual(world.get('management:originalImage'));
  await assertNoCachedLedgerOnBack(page, ui, tripId);
  expect(ui.writes).toHaveLength(1);
  await assertOtherDataUnchanged(world);
});
