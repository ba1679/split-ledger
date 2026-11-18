import { Then } from '../../../support/fixtures.js';
import { assertRejectedSelection } from '../../../support/thumbnail/rejection-result.js';

Then('畫面說明 {string} 並保留原已保存資料', async ({ world }, reason: string) => {
  await assertRejectedSelection(world, reason);
});
