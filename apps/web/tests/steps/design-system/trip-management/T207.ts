import { Then } from '../../../support/fixtures.js';
import { assertBackgroundFailed } from '../../../support/loading/background-failed.js';

Then('舊內容保持且局部等待結束並可重試', async ({ world }) => {
  await assertBackgroundFailed(world);
});
