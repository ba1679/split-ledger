import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T078: exact authoritative backend DSL registration.
When('使用者"甲"將餐費改為 JPY 2500', async ({ world }) => {
 await b.updateExpense(world,'餐費','2500','JPY');
});
