import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T072: exact authoritative backend DSL registration.
Then('"飲料"以 USD 12.50 保存', async ({ world }) => {
  await b.savedExpense(world, '飲料', '12.50', 'USD', 2, '1250');
});
