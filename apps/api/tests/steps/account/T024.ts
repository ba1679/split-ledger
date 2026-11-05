import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T024: exact authoritative backend DSL registration.
Then('帳號查詢回覆未登入', async ({ world }) => {
 await b.deniedAnonymous(world);
});
