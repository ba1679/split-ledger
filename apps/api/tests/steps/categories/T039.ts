import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T039: exact authoritative backend DSL registration.
Given('使用者"甲"已有"餐飲"及"Food"分類', async ({ world }) => {
  await b.category(world, 'Food');
  await b.categoryWithExpenses(world, '餐飲');
});
