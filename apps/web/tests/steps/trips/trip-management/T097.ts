import { When } from '../../../support/fixtures.js';
import { submitNewTrip } from '../../../support/trips/new-trip-flow.js';

When('owner 送出新增旅行', async ({ world }) => {
  await submitNewTrip(world);
});
