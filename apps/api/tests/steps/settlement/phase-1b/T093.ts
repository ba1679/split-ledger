import { Then } from '../../../support/fixtures.js';
import {
  assertSettlementAdjustments,
  settlementAdjustmentsPhrase,
  type SettlementAdjustmentRow,
} from '../../../support/splitting/settlement-adjustments-result.js';

Then(settlementAdjustmentsPhrase, async ({ world }, table) => {
  await assertSettlementAdjustments(world, table.hashes() as unknown as SettlementAdjustmentRow[]);
});
