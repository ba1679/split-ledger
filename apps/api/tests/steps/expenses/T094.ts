import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T094: exact authoritative backend DSL registration.
Then('支出保存被拒絕且帳本沒有"午餐"', async ({ world }) => {
 await b.rejectedExpense(world,true);
});
