import { Then } from '../../../support/fixtures.js';
import {
  assertConcurrentSettlementResult,
  concurrentSettlementResultPhrase,
} from '../../../support/splitting/concurrent-settlement-result.js';

Then(concurrentSettlementResultPhrase, async ({ world }) => {
  await assertConcurrentSettlementResult(world);
});
