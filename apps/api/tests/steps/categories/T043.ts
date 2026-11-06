import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T043: exact authoritative backend DSL registration.
When('使用者"甲"建立只有空白的分類', async ({ world }) => {
  await b.createCategory(world, '   ');
});
