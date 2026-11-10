import { When } from '../../../support/fixtures.js';
import {
  readSettlementPhrase,
  readTripSettlement,
} from '../../../support/splitting/read-settlement-command.js';

When(readSettlementPhrase, async ({ world }) => {
  await readTripSettlement(world);
});
