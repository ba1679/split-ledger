import { Then } from '../../../support/fixtures.js';
import {
  assertDeletedDinner,
  deletedDinnerResultPhrase,
} from '../../../support/splitting/deleted-dinner-result.js';

Then(deletedDinnerResultPhrase, async ({ page, world }) => {
  await assertDeletedDinner(page, world);
});
