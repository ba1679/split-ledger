import { Given } from '../../../support/fixtures.js';
import {
  otherTripCarolPhrase,
  seedOtherTripCarol,
} from '../../../support/splitting/other-trip-carol-fixture.js';

Given(otherTripCarolPhrase, async ({ world }) => {
  await seedOtherTripCarol(world);
});
