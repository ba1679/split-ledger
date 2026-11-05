import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T089: exact authoritative backend DSL registration.
When('使用者"甲"記錄"午餐"為 JPY 100.5，日期"2027-03-11"', async ({ world }) => {
 await b.createExpense(world,'午餐','100.5');
});
