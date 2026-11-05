import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T107: exact authoritative backend DSL registration.
Then('日期更新被拒絕且"日本旅行"日期維持不變', async ({ world }) => {
 await b.rejectedTripDates(world);
});
