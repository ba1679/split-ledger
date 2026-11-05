import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T018: exact authoritative backend DSL registration.
When('使用者"甲"查詢目前帳號', async ({ world }) => {
 await b.request(world, 'GET', '/api/me');
});
