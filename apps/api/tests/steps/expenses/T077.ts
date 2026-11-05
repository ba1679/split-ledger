import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T077: exact authoritative backend DSL registration.
When('使用者"甲"將機票改為 JPY 8000', async ({ world }) => {
 await b.updateExpense(world,'機票','8000','JPY');
});
