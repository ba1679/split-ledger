import { Then } from '../../../support/fixtures.js';
import {
  assertNewTripOwner,
  newTripOwnerResultPhrase,
} from '../../../support/splitting/new-trip-owner-result.js';

Then(newTripOwnerResultPhrase, async ({ world }) => {
  await assertNewTripOwner(world);
});
