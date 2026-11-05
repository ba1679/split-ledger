import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T084: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"有 TWD 8000、JPY 15000 與 JPY 2000 的已保存支出', async ({ world }) => {
 await b.trip(world); await b.expense(world,'機票','8000','TWD'); await b.expense(world,'住宿','15000'); await b.expense(world,'餐費','2000');
});
