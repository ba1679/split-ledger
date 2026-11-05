import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T017: exact authoritative backend DSL registration.
Given('使用者"甲"擁有"餐飲"分類且使用者"乙"已登入', async ({ world }) => {
 await b.otherAccountCategory(world);
});
