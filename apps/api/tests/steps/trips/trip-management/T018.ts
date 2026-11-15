import { Then } from '../../../support/fixtures.js';
import { assertPurgedTrip } from '../../../support/trip-management/purge-result.js';

Then('整趟旅行清除後才提交永久刪除結果', async ({ world }) => {
  await assertPurgedTrip(world);
});
