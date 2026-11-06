import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T098: exact authoritative backend DSL registration.
Then('"日本旅行"已保存且兩端日期皆未填', async ({ world }) => {
  await b.tripDates(world, '日本旅行', null, null);
});
