import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T048: exact authoritative backend DSL registration.
Given('使用者"甲"的"吃喝"分類仍被兩筆支出使用', async ({ world }) => {
  await b.categoryWithExpenses(world, '吃喝');
});
