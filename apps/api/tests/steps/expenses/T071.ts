import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T071: exact authoritative backend DSL registration.
Then('"機票"以 TWD 8000 及"2027-01-15"保存', async ({ world }) => {
  await b.savedExpense(world, '機票', '8000.00', 'TWD', 2, '800000', '2027-01-15');
});
