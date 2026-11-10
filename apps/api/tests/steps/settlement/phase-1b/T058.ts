import { When } from '../../../support/fixtures.js';
import {
  concurrentSettlementPhrase,
  requestConcurrentSettlements,
} from '../../../support/splitting/concurrent-settlement-command.js';

When(concurrentSettlementPhrase, async ({ world }) => {
  await requestConcurrentSettlements(world);
});
