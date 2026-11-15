import { Given, expect } from '../../../support/fixtures.js';
import { arrangeManagementPage, managementUI } from '../../../support/trips/management-fixture.js';
import { arrangeThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';
import { installIncompleteUpload } from '../../../support/thumbnail/incomplete-upload.js';
import { assertIncompleteUploadFailed } from '../../../support/thumbnail/incomplete-result.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';
import { managementTripId } from '../../../../../api/tests/support/trip-management/baseline.js';
import type { ThumbnailRequest } from '../../../../../api/tests/support/trip-management/thumbnail-request.js';

Given('前次圖片上傳在提交前中斷且現已恢復連線', async ({ page, world }) => {
  await arrangeManagementPage(page, world, '縮圖編輯');
  await arrangeThumbnailDraft(world, '神社照片');
  const fault = await installIncompleteUpload(
    page,
    `/api/trips/${managementTripId(world)}/thumbnail`,
  );
  world.tripManagement.cleanups.add(fault.dispose);
  world.set('management:incompleteUpload', fault);
  await page.getByRole('dialog').getByRole('button', { name: '保存圖片', exact: true }).click();
  await assertIncompleteUploadFailed(world);
  const failed = world.get<ThumbnailRequest>('management:thumbnailRequest');
  await fault.dispose();
  world.tripManagement.cleanups.delete(fault.dispose);
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  expect(managementUI(world).writes.length).toBe(1);
  world.set('management:writeStart', 1);
  world.set('management:failedThumbnailOperationId', failed.operationId);
  world.set('management:interruptedUploadRetryReady', {
    tripId: failed.tripId,
    operationId: failed.operationId,
  });
  await assertManagementUnchanged(world, 1);
});
