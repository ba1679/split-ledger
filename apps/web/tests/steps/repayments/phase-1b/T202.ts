import { Then } from '../../../support/fixtures.js';
import {
  assertRecoveredRepaymentScreen,
  recoveredRepaymentPhrase,
} from '../../../support/splitting/recovered-repayment-result.js';

Then(recoveredRepaymentPhrase, async ({ page, world }) => {
  await assertRecoveredRepaymentScreen(page, world);
});
