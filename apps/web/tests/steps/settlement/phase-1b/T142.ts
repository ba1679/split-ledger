import { createBdd } from 'playwright-bdd';
import { Given, test } from '../../../support/fixtures.js';
import {
  arrangeLostSettlementResponse,
  lostSettlementTemporaryPhrase,
  lostSettlementResponseKey,
  type LostSettlementResponseState,
} from '../../../support/splitting/lost-settlement-response.js';

Given(lostSettlementTemporaryPhrase, async ({ page, world }) => {
  await arrangeLostSettlementResponse(page, world, 'temporary-not-found');
});

const { After } = createBdd(test);
After(async ({ world }) => {
  if (world.state.has(lostSettlementResponseKey))
    await world.get<LostSettlementResponseState>(lostSettlementResponseKey).interceptor?.restore();
});
