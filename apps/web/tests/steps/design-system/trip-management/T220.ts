import { Then } from '../../../support/fixtures.js';
import { assertSettlementVerifying } from '../../../support/loading/settlement-unknown.js';

Then('實付結果尚未確認且不能重複新增', async ({ world }) => {
  await assertSettlementVerifying(world);
});
