import { When } from '../../../support/fixtures.js';
import { retryRead } from '../../../support/loading/retry-read.js';

When('owner 重試本次讀取', async ({ world }) => {
  await retryRead(world);
});
