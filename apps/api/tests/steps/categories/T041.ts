import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T041: exact authoritative backend DSL registration.
When('使用者"甲"建立 31 個餐字的分類', async ({ world }) => {
  await b.createCategory(world, '餐'.repeat(31));
});
