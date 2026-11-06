import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T015: exact authoritative backend DSL registration.
Given('使用者"甲"已有有效登入工作階段', async ({ world }) => {
  await b.login(world);
});
