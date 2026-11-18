import { Then, expect } from '../../../support/fixtures.js';
import type { CommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { assertDraftUrlsReleased } from '../../../support/thumbnail/object-urls.js';

Then('關閉後原圖片操作仍可查證且沒有撤銷命令', async ({ world }) => {
  const ui = managementUI(world),
    page = ui.page;
  const loss = world.get<CommittedResponseLoss>('management:responseLoss');
  const saved = world.get<{ operationId: string; tripId: string; intent: string; writes: number }>(
    'management:unknownReset',
  );
  await expect(page.getByRole('dialog')).toBeHidden();
  const verify = page.getByRole('button', { name: '再次查證', exact: true });
  await expect(verify).toBeVisible();
  await expect(verify).toBeEnabled();
  await verify.click({ trial: true });
  await waitForManagementReads(ui);
  expect(saved).toMatchObject({
    operationId: loss.command!.operationId,
    tripId: loss.command!.tripId,
    intent: 'reset',
  });
  expect(ui.writes.length).toBe(saved.writes);
  expect(loss.mutations).toHaveLength(1);
  expect(loss.mutations[0]).toMatchObject({ method: 'DELETE', operationId: saved.operationId });
  const receipt = await ownerRead(
    world,
    `/api/trips/${saved.tripId}/operations/${saved.operationId}`,
  );
  expect(receipt.status()).toBe(200);
  expect(await receipt.json()).toEqual(loss.outcome);
  const trip = await ownerRead(world, `/api/trips/${saved.tripId}`);
  expect(trip.status()).toBe(200);
  expect(await trip.json()).toMatchObject({
    id: saved.tripId,
    hasThumbnail: false,
    thumbnailRevision: String(loss.after!.trips[0]!.thumbnail_revision),
  });
  expect(await managementSnapshot(world, saved.tripId)).toEqual(loss.after);
  await assertDraftUrlsReleased(page);
  await assertOtherDataUnchanged(world);
});
