import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T091: exact authoritative backend DSL registration.
When('使用者"甲"記錄"飲料"為 USD 12.50，日期"2027-03-11"', async ({ world }) => {
 await b.createExpense(world,'飲料','12.50','USD');
});
