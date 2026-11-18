import { Then } from '../../../support/fixtures.js';
import { assertOtherDataUnchanged } from '../../../support/trip-management/preservation.js';

Then('其他旅行與共用資料保持原狀', async ({ world }) => {
  await assertOtherDataUnchanged(world);
});
