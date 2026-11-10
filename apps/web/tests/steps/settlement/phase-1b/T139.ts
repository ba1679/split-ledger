import { Given } from '../../../support/fixtures.js';
import {
  directSettlementScreenPhrase,
  openDirectSettlementScreen,
} from '../../../support/splitting/direct-settlement-screen.js';

Given(directSettlementScreenPhrase, async ({ page, world }) => {
  await openDirectSettlementScreen(page, world);
});
