import { Then } from '../../../support/fixtures.js';
import { assertOwnerList } from '../../../support/trip-management/lists.js';

Then('清單只包含 {string} 的本人旅行', async ({ world }, state: string) => {
  await assertOwnerList(world, state);
});
