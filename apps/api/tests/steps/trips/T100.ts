import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T100: exact authoritative backend DSL registration.
Then('"日本旅行"期間為"2027-03-10"至"2027-03-15"', async ({ world }) => {
  await b.tripDates(world, '日本旅行', '2027-03-10', '2027-03-15', 200);
});
