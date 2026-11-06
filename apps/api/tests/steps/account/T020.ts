import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T020: exact authoritative backend DSL registration.
Given('使用者尚未完成登入', async ({ world }) => {
  await b.anonymous(world);
});
