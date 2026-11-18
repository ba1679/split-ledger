import { When, test } from '../../../support/fixtures.js';
import type { TransportFixture } from '../../../support/trip-management/transport-fixture.js';
import { startRawUpload } from '../../../support/trip-management/raw-upload.js';

When('送出本次縮圖傳輸', async ({ world }) => {
  // Exercise the real 60s receiving deadline without changing production settings.
  test.setTimeout(105000);
  const fixture = world.get<TransportFixture>('management:transport');
  const upload = startRawUpload(
    new URL(`/api/trips/${fixture.tripId}/thumbnail`, world.origin),
    fixture.headers,
    fixture.body,
    fixture.finish,
  );

  world.tripManagement.cleanups.add(async () => {
    await upload.dispose();
  });
  if (fixture.condition === '處理逾時') await fixture.gate!.waitUntilReached();
  fixture.outcome = await upload.result;
  await upload.dispose();
});
