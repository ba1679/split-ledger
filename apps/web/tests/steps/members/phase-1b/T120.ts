import { Given } from '../../../support/fixtures.js';
import {
  otherTripAmyPhrase,
  seedBrowserOtherTripAmy,
} from '../../../support/splitting/other-trip-amy-fixture.js';

Given(otherTripAmyPhrase, async ({ page, world }) => {
  await seedBrowserOtherTripAmy(page, world);
});
