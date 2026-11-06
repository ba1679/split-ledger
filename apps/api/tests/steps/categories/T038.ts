import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T038: exact authoritative backend DSL registration.
Given('使用者"甲"已有"餐飲"分類', async ({ world }) => {
  await b.category(world);
});
