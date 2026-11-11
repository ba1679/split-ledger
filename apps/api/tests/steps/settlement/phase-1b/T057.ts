import { When } from '../../../support/fixtures.js';
import {
  recoverSavedSettlement,
  recoverSettlementPhrase,
} from '../../../support/splitting/recover-settlement-command.js';

When(recoverSettlementPhrase, async ({ world }) => {
  await recoverSavedSettlement(world);
});
