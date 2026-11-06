import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T049: exact authoritative backend DSL registration.
Given('使用者"甲"的"吃喝"分類沒有支出引用', async ({ world }) => {
  await b.categoryWithExpenses(world, '吃喝', false);
});
