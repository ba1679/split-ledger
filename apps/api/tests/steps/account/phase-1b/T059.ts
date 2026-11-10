import { Then } from '../../../support/fixtures.js';
import {
  assertUnauthenticatedSettlementResult,
  unauthenticatedSettlementResultPhrase,
} from '../../../support/splitting/unauthenticated-settlement-result.js';

Then(unauthenticatedSettlementResultPhrase, async ({ world }) => {
  await assertUnauthenticatedSettlementResult(world);
});
