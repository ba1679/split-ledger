import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T064: exact authoritative backend DSL registration.
Given('使用者"甲"已登入', async ({ world }) => {
 await b.login(world);
});
