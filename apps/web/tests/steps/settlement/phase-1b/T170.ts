import { When } from '../../../support/fixtures.js';
import {
  openAmySettlement,
  openAmySettlementPhrase,
} from '../../../support/splitting/open-amy-settlement.js';

When(openAmySettlementPhrase, async ({ page, world }) => {
  await openAmySettlement(page, world);
});
