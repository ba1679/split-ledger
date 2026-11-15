import { When } from '../../../support/fixtures.js';
import { writeTrashedTrip } from '../../../support/trip-management/trashed-writes.js';

When('owner 對垃圾桶旅行送出 {string}', async ({ world }, operation: string) => {
  await writeTrashedTrip(world, operation);
});
