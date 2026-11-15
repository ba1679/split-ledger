import { When } from '../../../support/fixtures.js';
import type { SnackDraft } from '../../../support/trip-management/race-fixture.js';
import {
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from '../../../support/trip-management/baseline.js';

When('owner 保存 JPY 500 的點心支出', async ({ world }) => {
  const draft = world.get<SnackDraft>('management:snackDraft');

  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.set('management:snackRequest', draft);
  world.response = await world.api.post(`/api/trips/${managementTripId(world)}/expenses`, {
    headers: { cookie: world.users.get('Alice')!.cookie, origin: world.get('webOrigin') },
    data: draft,
  });
});
