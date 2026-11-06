import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T099: exact authoritative backend DSL registration.
Then('"日本旅行"已保存且結束日未填', async ({ world }) => {
  await b.tripDates(world, '日本旅行', '2027-03-10', null);
});
