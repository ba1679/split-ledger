import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T070: exact authoritative backend DSL registration.
Then('"日本旅行"總額為 TWD 8000 與 JPY 17000', async ({ world }) => {
 await b.totals(world,{TWD:'8000.00',JPY:'17000'},200);
});
