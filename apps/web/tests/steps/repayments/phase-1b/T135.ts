import { createBdd } from 'playwright-bdd';
import { Given, test } from '../../../support/fixtures.js';
import {
  arrangeLostRepaymentResponse,
  lostRepaymentResponseKey,
  type LostRepaymentResponseState,
} from '../../../support/splitting/lost-repayment-response.js';

Given('獨立還款成功回應遺失但原結果可查證', async ({ page, world }) => {
  await arrangeLostRepaymentResponse(page, world, 'available');
});

const { After } = createBdd(test);
After(async ({ world }) => {
  if (world.state.has(lostRepaymentResponseKey))
    await world.get<LostRepaymentResponseState>(lostRepaymentResponseKey).interceptor?.restore();
});
