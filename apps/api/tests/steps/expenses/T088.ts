import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T088: exact authoritative backend DSL registration.
When('使用者"甲"記錄"午餐"為 JPY 0，日期"2027-03-11"', async ({ world }) => {
  await b.createExpense(world, '午餐', '0');
});
