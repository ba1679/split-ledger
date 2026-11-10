import { When } from '../../../support/fixtures.js';
import {
  saveIndependentRepayment,
  saveIndependentRepaymentPhrase,
} from '../../../support/splitting/save-independent-repayment.js';

When(saveIndependentRepaymentPhrase, async ({ page, world }) => {
  await saveIndependentRepayment(page, world);
});
