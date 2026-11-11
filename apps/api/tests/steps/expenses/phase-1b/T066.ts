import { Then } from '../../../support/fixtures.js';
import {
  assertDeletedDinnerResult,
  deletedDinnerResultPhrase,
} from '../../../support/splitting/deleted-dinner-result.js';

Then(deletedDinnerResultPhrase, async ({ world }) => {
  await assertDeletedDinnerResult(world);
});
