import { Then } from '../../../support/fixtures.js';
import {
  assertSequentialSnackSettled,
  sequentialSettlementResultPhrase,
} from '../../../support/splitting/sequential-settlement-result.js';

Then(sequentialSettlementResultPhrase, async ({ world }) => {
  await assertSequentialSnackSettled(world);
});
