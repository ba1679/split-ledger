import { Given, expect } from '../../support/fixtures.js';
import {
  seedCategory,
  apiItems,
  categoryPreference,
} from '../../support/accounts-categories-trips.js';

Given('此裝置對目前帳號上次選擇的 "交通" 分類仍可用', async ({ page, world }) => {
  const category = await seedCategory(world, '交通');

  await categoryPreference(page, world, category.id);
  expect(
    (await apiItems(world, '/api/categories')).find((row) => row.id === category.id),
  ).toMatchObject({ name: '交通' });
});
