import { Then, expect } from '../../../support/fixtures.js';
import { assertTrashCategoryUsage } from '../../../support/trip-management/category-result.js';

Then('分類使用筆數仍為 1', async ({ world }) => {
  expect(world.response!.status()).toBe(200);
  await assertTrashCategoryUsage(world, await world.response!.json());
});
