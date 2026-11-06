import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T025: exact authoritative backend DSL registration.
Then('旅行修改回覆找不到且原日期維持不變', async ({ world }) => {
  await b.deniedTripUpdate(world);
});
