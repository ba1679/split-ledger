import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T067: exact authoritative backend DSL registration.
Then('"日本旅行"日幣總額為 10500', async ({ world }) => {
  await b.deletedExpenseTotals(world);
});
