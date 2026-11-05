import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T069: exact authoritative backend DSL registration.
Then('"日本旅行"總額只有 JPY 25500', async ({ world }) => {
 await b.updatedExpenseTotals(world,'機票','8000',{JPY:'25500'});
});
