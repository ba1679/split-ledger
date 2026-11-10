import { Then } from '../../../support/fixtures.js';
import {
  assertZeroSettlementRejected,
  zeroSettlementRejectedPhrase,
} from '../../../support/splitting/zero-settlement-rejected-result.js';

Then(zeroSettlementRejectedPhrase, async ({ page, world }) => {
  await assertZeroSettlementRejected(page, world);
});
