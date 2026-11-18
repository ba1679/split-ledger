import { When, expect } from '../../../support/fixtures.js';
import {
  selectExactImage,
  type UploadImage,
} from '../../../../../api/tests/support/trip-management/generated-images.js';
import { savePreparedFile } from '../../../support/thumbnail/save-prepared-file.js';
import { managementTripId } from '../../../../../api/tests/support/trip-management/baseline.js';

When('owner 重試中斷後的圖片保存', async ({ world }) => {
  const ready = world.get<{ tripId: string; operationId: string }>(
    'management:interruptedUploadRetryReady',
  );
  expect(ready.tripId).toBe(managementTripId(world));
  await selectExactImage(world, 'PNG', 65536, 64, 48);
  const file = world.get<UploadImage[]>('management:uploadFiles')[0]!;
  // A fresh visible selection/save is a new intent, not a replay of the truncated stream.
  await savePreparedFile(world, file);
});
