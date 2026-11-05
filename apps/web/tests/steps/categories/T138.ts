import { Then } from '../../support/fixtures.js';
import { assertUnclassified } from '../../support/accounts-categories-trips.js';

Then('午餐支出仍存在且沒有分類', async ({ page, world }) => {
  await assertUnclassified(page, world);
});
