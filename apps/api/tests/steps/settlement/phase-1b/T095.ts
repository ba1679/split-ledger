import { Then } from '../../../support/fixtures.js';
import {
  assertNoRoundingPolicy,
  noRoundingPolicyPhrase,
} from '../../../support/splitting/no-rounding-policy-result.js';

Then(noRoundingPolicyPhrase, async ({ world }) => {
  await assertNoRoundingPolicy(world);
});
