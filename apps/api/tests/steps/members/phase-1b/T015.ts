import { Given } from '../../../support/fixtures.js';
import { seedOtherTripMember } from '../../../support/splitting/other-trip-member-fixture.js';

Given('另一趟旅行已有同行者 {string}', async ({ world }, name: string) => {
  await seedOtherTripMember(world, name);
});
