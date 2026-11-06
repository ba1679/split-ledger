import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T066: exact authoritative backend DSL registration.
Then('"日本旅行"不再含"住宿"支出', async ({ world }) => {
  await b.deletedExpense(world);
});
