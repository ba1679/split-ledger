import { Then } from '../../../support/fixtures.js';
import { assertPrivateAccess } from '../../../support/trip-management/access-result.js';

Then('請求不洩漏他人旅行且資料不變', async ({ world }) => {
  await assertPrivateAccess(world);
});
