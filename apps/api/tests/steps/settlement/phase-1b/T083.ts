import { Then } from '../../../support/fixtures.js';
import {
  assertSettlementZeroSums,
  zeroSumPhrase,
} from '../../../support/splitting/zero-sum-result.js';

Then(zeroSumPhrase, async ({ world }) => {
  await assertSettlementZeroSums(world);
});
