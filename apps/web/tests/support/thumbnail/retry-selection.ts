import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  selectExactImage,
  type UploadImage,
} from '../../../../api/tests/support/trip-management/generated-images.js';
import { arrangeManagementPage, managementUI } from '../trips/management-fixture.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';
import { arrangeInvalidSelection } from './invalid-selection.js';
import { rejectSelection, type RejectedSelectionAct } from './reject-selection.js';
import { assertRejectedSelection } from './rejection-result.js';

export async function arrangeSelectionRetry(
  page: Page,
  world: LedgerWorld,
  reason: string,
): Promise<void> {
  await arrangeManagementPage(page, world, '縮圖編輯');
  await arrangeInvalidSelection(world, reason);
  await rejectSelection(world);
  await assertRejectedSelection(world, reason);
  const failed = world.get<RejectedSelectionAct>('management:rejectedSelectionAct');
  const writes = failed.writes + (failed.source === 'server' ? 1 : 0);
  expect(managementUI(world).writes.length).toBe(writes);
  await selectExactImage(world, 'JPEG .jpg', 1048576, 4000, 3000);
  const file = world.get<UploadImage[]>('management:uploadFiles')[0]!;
  expect(file.bytes.length).toBe(1048576);
  world.set('management:selectionRetry', { reason, file, writes });
  world.set('management:writeStart', writes);
  if (failed.operationId) world.set('management:failedThumbnailOperationId', failed.operationId);
  await assertManagementUnchanged(world, writes);
}
