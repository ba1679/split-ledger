import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T040: exact authoritative backend DSL registration.
When('使用者"甲"建立 30 個餐字的分類', async ({ world }) => {
 await b.createCategory(world,'餐'.repeat(30));
});
