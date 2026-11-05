import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T097: exact authoritative backend DSL registration.
Then('"台南旅行"已保存且開始日未填', async ({ world }) => {
 await b.tripDates(world,'台南旅行',null,'2027-04-05');
});
