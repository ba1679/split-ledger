import { When } from '../../../support/fixtures.js';
import { endSettlementVerification } from '../../../support/loading/end-settlement-verification.js';

When('本輪結果查證結束仍未知', async ({ world }) => {
  await endSettlementVerification(world);
});
