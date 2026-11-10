import { Then } from '../../../support/fixtures.js';
import {
  assertRecoveredSettlement,
  recoveredSettlementResultPhrase,
} from '../../../support/splitting/recovered-settlement-result.js';

Then(recoveredSettlementResultPhrase, async ({ world }) => {
  await assertRecoveredSettlement(world);
});
