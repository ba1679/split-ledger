import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T023: exact authoritative backend DSL registration.
Then('回傳使用者"甲"的帳號身分', async ({ world }) => {
 await b.account(world);
});
