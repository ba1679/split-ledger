import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T016: exact authoritative backend DSL registration.
Given('使用者"甲"擁有"日本旅行"且使用者"乙"已登入', async ({ world }) => {
  await b.otherAccountTrip(world);
});
