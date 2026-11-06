import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T045: exact authoritative backend DSL registration.
Given('使用者"甲"有"日本旅行"及"台南旅行"且擁有"餐飲"分類', async ({ world }) => {
  await b.categoryWithExpenses(world, '餐飲');
});
