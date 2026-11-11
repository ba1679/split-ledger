import { When } from '../../../support/fixtures.js';
import {
  directSplittingAccess,
  directSplittingAccessPhrase,
} from '../../../support/splitting/direct-splitting-access.js';

When(directSplittingAccessPhrase, async ({ world }) => {
  await directSplittingAccess(world);
});
