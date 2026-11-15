import { Then } from '../../../support/fixtures.js';
import { assertLatestBackground } from '../../../support/loading/background-latest.js';

Then('最新已保存資料完整顯示且沒有重複', async ({ world }) => {
  await assertLatestBackground(world);
});
