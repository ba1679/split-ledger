import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T073: exact authoritative backend DSL registration.
When('使用者"甲"刪除"住宿"支出', async ({ world }) => {
  await b.deleteExpense(world);
});
