import { When } from '../../../support/fixtures.js';
import {
  independentRepaymentPhrase,
  recordIndependentRepayment,
} from '../../../support/splitting/independent-repayment-command.js';

When(independentRepaymentPhrase, async ({ world }, amount: string) => {
  await recordIndependentRepayment(world, amount);
});
