import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T044: exact authoritative backend DSL registration.
When('使用者"甲"建立名稱為" 餐飲 "的分類', async ({ world }) => {
  await b.createCategory(world, ' 餐飲 ');
});
