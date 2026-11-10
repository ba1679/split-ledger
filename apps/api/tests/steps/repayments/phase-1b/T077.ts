import { Then } from '../../../support/fixtures.js';
import {
  assertRepaymentFacts,
  repaymentFactsPhrase,
} from '../../../support/splitting/repayment-facts-result.js';

Then(repaymentFactsPhrase, async ({ world }) => {
  await assertRepaymentFacts(world);
});
