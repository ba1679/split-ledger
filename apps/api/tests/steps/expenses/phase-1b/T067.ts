import { Then } from '../../../support/fixtures.js';
import {
  assertReplacedDinnerShares,
  replacedDinnerSharesPhrase,
} from '../../../support/splitting/replaced-dinner-shares.js';

Then(replacedDinnerSharesPhrase, async ({ world }) => {
  await assertReplacedDinnerShares(world);
});
