import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T031: exact authoritative backend DSL registration.
Given('使用者"乙"已有"交通"分類且使用者"甲"已登入', async ({ world }) => {
  await b.category(world, '交通', '乙');
  await b.login(world);
});
