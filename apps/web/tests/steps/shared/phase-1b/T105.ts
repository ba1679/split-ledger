import { Given } from '../../../support/fixtures.js';
import {
  browserIndependentRepaymentPhrase,
  seedBrowserIndependentRepayment,
} from '../../../support/splitting/independent-repayment-fixture.js';

Given(browserIndependentRepaymentPhrase, async ({ world }, amount: string) => {
  await seedBrowserIndependentRepayment(world, amount);
});
