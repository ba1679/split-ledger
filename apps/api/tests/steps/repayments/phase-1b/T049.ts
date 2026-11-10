import { When } from '../../../support/fixtures.js';
import {
  invalidRepaymentPhrase,
  requestInvalidRepayment,
} from '../../../support/splitting/invalid-repayment-command.js';

When(invalidRepaymentPhrase, async ({ world }, problem: string) => {
  await requestInvalidRepayment(world, problem);
});
