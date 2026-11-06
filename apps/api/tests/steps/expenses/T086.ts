import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T086: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"期間為"2027-03-10"至"2027-03-15"', async ({ world }) => {
  await b.trip(world, '日本旅行', { startDate: '2027-03-10', endDate: '2027-03-15' });
});
