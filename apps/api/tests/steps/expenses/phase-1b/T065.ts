import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedInactiveShares,
  preservedInactiveSharesPhrase,
} from '../../../support/splitting/preserved-inactive-shares.js';

Then(preservedInactiveSharesPhrase, async ({ world }) => {
  await assertPreservedInactiveShares(world);
});
