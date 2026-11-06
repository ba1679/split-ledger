import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T083: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"有 TWD 8000 的機票與 JPY 17500 的其他支出', async ({ world }) => {
  await b.trip(world);
  await b.expense(world, '機票', '8000', 'TWD');
  await b.expense(world, '其他支出', '17500');
});
