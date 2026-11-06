import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T065: exact authoritative backend DSL registration.
Then('"午餐"已保存且沒有分類', async ({ world }) => {
  await b.savedExpense(world, '午餐', '100', 'JPY', 0, '100');
});
