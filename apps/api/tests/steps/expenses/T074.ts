import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T074: exact authoritative backend DSL registration.
When('使用者"甲"在"日本旅行"記錄"機票"為 TWD 8000，日期"2027-01-15"', async ({ world }) => {
  await b.createExpense(world, '機票', '8000', 'TWD', '2027-01-15');
});
