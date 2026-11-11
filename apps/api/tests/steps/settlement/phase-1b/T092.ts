import { Then } from '../../../support/fixtures.js';
import {
  assertFailedSettlementResult,
  failedSettlementPhrase,
} from '../../../support/splitting/failed-settlement-result.js';

Then(failedSettlementPhrase, async ({ world }) => {
  await assertFailedSettlementResult(world);
});
