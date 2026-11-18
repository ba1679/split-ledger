import { Then } from '../../../support/fixtures.js';
import { assertImageRejected } from '../../../support/trip-management/thumbnail-rejection.js';

Then('圖片拒絕為 {string} 且保留原縮圖', async ({ world }, reason: string) => {
  await assertImageRejected(world, reason);
});
