import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T105: exact authoritative backend DSL registration.
When('使用者"甲"建立開始日為"2027-03-10"的"日本旅行"', async ({ world }) => {
  await b.createTrip(world, '日本旅行', { startDate: '2027-03-10' });
});
