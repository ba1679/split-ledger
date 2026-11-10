import { Given } from '../../../support/fixtures.js';
import { armPartialAdjustmentFailure } from '../../../support/splitting/transaction-fault-fixture.js';

Given('結清交易在寫入部分調整後將發生錯誤', async ({ world }) => {
  await armPartialAdjustmentFailure(world);
});
