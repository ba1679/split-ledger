import { createBdd } from 'playwright-bdd';
import { Given, test } from '../../../support/fixtures.js';
import {
  arrangeLostRepaymentResponse,
  lostRepaymentResponseKey,
  lostRepaymentTemporaryPhrase,
  type LostRepaymentResponseState,
} from '../../../support/splitting/lost-repayment-response.js';

Given(lostRepaymentTemporaryPhrase, async ({ page, world }) => {
  await arrangeLostRepaymentResponse(page, world, 'temporary-not-found');
});

const { After } = createBdd(test);
After(async ({ world }) => {
  if (world.state.has(lostRepaymentResponseKey))
    await world.get<LostRepaymentResponseState>(lostRepaymentResponseKey).interceptor?.restore();
});
