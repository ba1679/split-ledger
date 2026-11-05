import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T092: exact authoritative backend DSL registration.
When('使用者"甲"記錄未分類的"午餐"支出', async ({ world }) => {
 await b.createExpense(world,'午餐','100');
});
