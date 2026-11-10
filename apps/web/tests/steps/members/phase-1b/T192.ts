import { Then } from '../../../support/fixtures.js';
import {
  assertPrivateSplittingAccess,
  privateSplittingAccessResultPhrase,
} from '../../../support/splitting/private-splitting-access-result.js';

Then(privateSplittingAccessResultPhrase, async ({ world }) => {
  await assertPrivateSplittingAccess(world);
});
