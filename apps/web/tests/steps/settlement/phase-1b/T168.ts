import { When } from '../../../support/fixtures.js';
import {
  viewSettlementPhrase,
  viewBrowserSettlement,
} from '../../../support/splitting/view-settlement.js';

When(viewSettlementPhrase, async ({ page, world }) => {
  await viewBrowserSettlement(page, world);
});
