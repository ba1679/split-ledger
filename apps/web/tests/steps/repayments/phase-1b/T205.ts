import { Then } from '../../../support/fixtures.js';
import {
  assertStaleOverpaymentResult,
  staleOverpaymentResultPhrase,
} from '../../../support/splitting/stale-overpayment-result.js';

Then(staleOverpaymentResultPhrase, async ({ page, world }) => {
  await assertStaleOverpaymentResult(page, world);
});
