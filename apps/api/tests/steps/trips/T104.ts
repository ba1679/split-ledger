import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T104: exact authoritative backend DSL registration.
When('使用者"甲"建立結束日為"2027-04-05"的"台南旅行"', async ({ world }) => {
  await b.createTrip(world, '台南旅行', { endDate: '2027-04-05' });
});
