import { Then } from '../../../support/fixtures.js';
import { assertNewTrip } from '../../../support/trips/new-trip-result.js';

Then('新旅行只建立一次並使用 {string}', async ({ world, browser }, picture: string) => {
  await assertNewTrip(world, browser, picture);
});
