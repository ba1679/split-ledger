import { Given, expect } from '../../support/fixtures.js';
import {
  seedIdentity,
  seedCategory,
  rows,
  apiItems,
  snapshot,
  categoriesPage,
} from '../../support/accounts-categories-trips.js';

Given('另一帳號已有 "交通" 分類且目前帳號沒有', async ({ page, world }) => {
  await seedCategory(world, '交通', '乙');
  await seedIdentity(world);
  await snapshot(world);
  await categoriesPage(page, world);
  expect(await rows(world, 'categories')).toHaveLength(0);
  expect(await apiItems(world, '/api/categories')).toHaveLength(0);
});
