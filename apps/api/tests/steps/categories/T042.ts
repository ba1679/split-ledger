import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T042: exact authoritative backend DSL registration.
When('使用者"甲"建立"交通"分類', async ({ world }) => {
  await b.createCategory(world, '交通');
});
