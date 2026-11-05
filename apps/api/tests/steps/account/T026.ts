import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T026: exact authoritative backend DSL registration.
Then('旅行查詢回覆找不到且不揭露甲的資料', async ({ world }) => {
 await b.deniedResource(world,'trip');
});
