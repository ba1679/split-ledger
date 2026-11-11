import { Given } from '../../../support/fixtures.js';
import { arrangeLostSettlementResponse } from '../../../support/splitting/lost-settlement-response.js';

Given('結清成功回應遺失但原結果可查證', async ({ page, world }) => {
  await arrangeLostSettlementResponse(page, world, 'available');
});
