import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T103: exact authoritative backend DSL registration.
When('使用者"甲"建立未填日期的"日本旅行"', async ({ world }) => {
  await b.createTrip(world, '日本旅行');
});
