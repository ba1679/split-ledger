import { Then } from '../../../support/fixtures.js';
import { assertInitialFailed } from '../../../support/loading/initial-failed.js';

Then('初讀等待結束並顯示讀取錯誤與重試', async ({ world }) => {
  await assertInitialFailed(world);
});
