import { Then } from '../../../support/fixtures.js';
import {
  assertConfirmedOverpaymentScreen,
  confirmedOverpaymentResultPhrase,
} from '../../../support/splitting/confirmed-overpayment-result.js';

Then(confirmedOverpaymentResultPhrase, async ({ page, world }) => {
  await assertConfirmedOverpaymentScreen(page, world);
});
