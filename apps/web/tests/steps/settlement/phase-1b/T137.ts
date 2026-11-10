import { Given } from '../../../support/fixtures.js';
import {
  enabledSettlementScreenPhrase,
  openConfirmedSettlementScreen,
} from '../../../support/splitting/settlement-screen.js';

Given(enabledSettlementScreenPhrase, async ({ page, world }) => {
  await openConfirmedSettlementScreen(page, world, true);
});
