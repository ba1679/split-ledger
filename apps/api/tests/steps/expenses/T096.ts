import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T096: exact authoritative backend DSL registration.
Then('支出清單包含 JPY 1200 的"午餐"', async ({ world }) => {
 await b.expenseInList(world);
});
