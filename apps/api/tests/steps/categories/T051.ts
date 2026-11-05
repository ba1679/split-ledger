import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T051: exact authoritative backend DSL registration.
Given('使用者"甲"的"餐飲"分類已有兩筆跨旅行支出', async ({ world }) => {
 await b.categoryWithExpenses(world,'餐飲');
});
