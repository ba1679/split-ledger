import { Given } from '../../../support/fixtures.js';
import { arrangeTrashCategory } from '../../../support/trip-management/category-fixture.js';

Given('餐飲分類僅被垃圾桶旅行的一筆支出引用', async ({ world }) => {
  await arrangeTrashCategory(world);
});
