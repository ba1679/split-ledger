import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T093: exact authoritative backend DSL registration.
When('使用者"甲"記錄項目空白的 JPY 100 支出', async ({ world }) => {
  await b.createExpense(world, '   ', '100');
});
