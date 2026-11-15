import { Given, expect } from '../../../support/fixtures.js';
import { installIncompleteUpload } from '../../../support/thumbnail/incomplete-upload.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import type { ThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';
import { managementTripId } from '../../../../../api/tests/support/trip-management/baseline.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Given('新縮圖上傳會在提交前中斷且確定未保存', async ({ world }) => {
  const draft = world.get<ThumbnailDraft>('management:draft');
  expect(draft.name).toBe('神社照片');
  expect(draft.intent).toBe('save');
  await assertManagementUnchanged(world);
  const fault = await installIncompleteUpload(
    managementUI(world).page,
    `/api/trips/${managementTripId(world)}/thumbnail`,
  );
  world.tripManagement.cleanups.add(fault.dispose);
  world.set('management:incompleteUpload', fault);
});
