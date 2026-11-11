import { When } from '../../../support/fixtures.js';
import {
  readRepaymentsPhrase,
  readTripRepayments,
} from '../../../support/splitting/read-repayments-command.js';

When(readRepaymentsPhrase, async ({ world }) => {
  await readTripRepayments(world);
});
