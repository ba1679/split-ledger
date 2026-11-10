import { When } from '../../../support/fixtures.js';
import {
  saveBrowserSettlement,
  saveSettlementPhrase,
} from '../../../support/splitting/save-settlement.js';

When(saveSettlementPhrase, async ({ page, world }, amount: string) => {
  await saveBrowserSettlement(page, world, amount);
});
