import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T062: exact authoritative backend DSL registration.
Then('日幣為零位小數且美元為兩位小數', async ({ world }) => {
  await b.currencyResult(world);
});
