import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T068: exact authoritative backend DSL registration.
Then('"日本旅行"日幣總額為 17500', async ({ world }) => {
 await b.updatedExpenseTotals(world,'餐費','2500',{JPY:'17500'});
});
