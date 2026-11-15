import { When, expect } from '../../../support/fixtures.js';
import { managementSnapshot, managementTripId } from '../../../support/trip-management/baseline.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';

When('owner 讀取 {string} 的縮圖', async ({ world }, selected: string) => {
  const before = await managementSnapshot(world);
  const tripId = managementTripId(world);
  const revision = String(before.trips[0]?.thumbnail_revision);
  const paths: Record<string, string> = {
    一般目前: `/api/trips/${tripId}/thumbnail/${revision}`,
    垃圾桶目前: `/api/trips/trash/${tripId}/thumbnail/${revision}`,
    舊版本: `/api/trips/${tripId}/thumbnail/${world.get<string>('management:previousThumbnailRevision')}`,
    已刪舊連結: world.get<string>('management:prePurgeThumbnailUrl'),
  };
  const path = paths[selected];

  expect(path).toBeDefined();
  world.set('management:before', before);
  world.set('management:thumbnailReadPath', path);
  world.response = await ownerRead(world, path!);
});
