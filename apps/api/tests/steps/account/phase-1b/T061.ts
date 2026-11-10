import { Then } from '../../../support/fixtures.js';
import {
  assertCrossTripResult,
  crossTripResultPhrase,
} from '../../../support/splitting/cross-trip-result.js';

Then(crossTripResultPhrase, async ({ world }) => {
  await assertCrossTripResult(world);
});
