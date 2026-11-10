import { Then } from '../../../support/fixtures.js';
import {
  assertSequentialBrowserSettlement,
  sequentialBrowserSettlementPhrase,
} from '../../../support/splitting/sequential-browser-settlement-result.js';

Then(sequentialBrowserSettlementPhrase, async ({ page, world }) => {
  await assertSequentialBrowserSettlement(page, world);
});
