import { Then } from '../../../support/fixtures.js';
import {
  assertBrowserSettlementClosed,
  closedSettlementPhrase,
} from '../../../support/splitting/closed-settlement-result.js';

Then(closedSettlementPhrase, async ({ page, world }, payer: string, paid: string, owed: string) => {
  await assertBrowserSettlementClosed(page, world, payer, paid, owed);
});
