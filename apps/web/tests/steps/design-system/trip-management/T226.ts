import { Then } from '../../../support/fixtures.js';
import { assertSettlementConfirmed } from '../../../support/loading/settlement-confirmed.js';

Then('原實付已確認且恰有一筆付款事實', async ({ world }) => {
  await assertSettlementConfirmed(world);
});
