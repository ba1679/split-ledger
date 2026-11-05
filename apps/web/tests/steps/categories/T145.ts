import { Given, expect } from '../../support/fixtures.js';
import { seedCategory, apiItems, categoryPreference } from '../../support/accounts-categories-trips.js';

Given('此裝置對目前帳號上次選擇的分類已被刪除', async ({ page, world }) => {
  const deleted = await seedCategory(world, '已刪除');
  await world.db.query('DELETE FROM categories WHERE id = $1', [deleted.id]);
  await categoryPreference(page, world, deleted.id);
  expect((await apiItems(world, '/api/categories')).some(row => row.id === deleted.id)).toBe(false);
});
