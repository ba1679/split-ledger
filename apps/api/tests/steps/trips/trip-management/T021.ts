import { Then } from '../../../support/fixtures.js';
import { assertCommandRollback } from '../../../support/trip-management/rollback-result.js';

Then('交易失敗回報錯誤且全部權威資料回滾', async ({ world }) => {
  await assertCommandRollback(world);
});
