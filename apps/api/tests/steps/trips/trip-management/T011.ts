import { Then } from '../../../support/fixtures.js';
import { assertPreservedTrip } from '../../../support/trip-management/preservation.js';

Then('旅行專屬資料與帳務對照完全一致', async ({ world }) => {
  await assertPreservedTrip(world);
});
