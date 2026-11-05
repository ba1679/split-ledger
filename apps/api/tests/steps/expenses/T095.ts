import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T095: exact authoritative backend DSL registration.
Then('支出保存被拒絕且帳本沒有新增支出', async ({ world }) => {
 await b.rejectedExpense(world);
});
