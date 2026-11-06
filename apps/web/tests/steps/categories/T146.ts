import { Given } from '../../support/fixtures.js';
import { seedCategory, categoryPreference } from '../../support/accounts-categories-trips.js';

Given('此裝置對目前帳號沒有可用的上次分類紀錄', async ({ page, world }) => {
  await seedCategory(world, '交通');
  await categoryPreference(page, world, null);
});
