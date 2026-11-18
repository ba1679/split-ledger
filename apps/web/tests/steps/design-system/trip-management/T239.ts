import { Then } from '../../../support/fixtures.js';
import { assertOfflineRecovered } from '../../../support/loading/offline-result.js';

Then('連線等待結束且旅行資料可正常使用', async ({ world }) => {
  await assertOfflineRecovered(world);
});
