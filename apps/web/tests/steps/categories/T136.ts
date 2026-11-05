import { Then, expect } from '../../support/fixtures.js';
import { named, assertSharedClassification } from '../../support/accounts-categories-trips.js';
import type { Row } from '../../support/accounts-categories-trips.js';

Then('兩趟旅行的原支出都顯示 "吃喝" 分類', async ({ page, world }) => {
  const originalCategory = world.get<Row[]>('category:before').find(row => row.name === '餐飲')!;
  expect((await named(world, 'categories', '吃喝')).id).toBe(originalCategory.id);
  await assertSharedClassification(page, world, '吃喝');
});
