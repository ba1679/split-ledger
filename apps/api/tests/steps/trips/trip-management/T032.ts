import { When } from '../../../support/fixtures.js';
import type { RecordedTripCommand } from '../../../support/trip-management/commands.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';

When('owner 重送同一次原旅行操作', async ({ world }) => {
  const original = world.get<RecordedTripCommand>('management:originalCommand');

  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.set('management:replayedOperationId', original.operationId);
  world.response = await world.api.fetch(original.path, {
    method: original.method,
    headers: original.headers,
    ...(original.data ? { data: original.data } : {}),
    ...(original.image
      ? {
          multipart: { image: { name: '神社.png', mimeType: 'image/png', buffer: original.image } },
        }
      : {}),
  });
});
