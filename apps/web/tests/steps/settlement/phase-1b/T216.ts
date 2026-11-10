import { Then } from '../../../support/fixtures.js';
import {
  assertRecoveredSettlementScreen,
  recoveredSettlementPhrase,
} from '../../../support/splitting/recovered-settlement-result.js';

Then(recoveredSettlementPhrase, async ({ page, world }) => {
  await assertRecoveredSettlementScreen(page, world);
});
