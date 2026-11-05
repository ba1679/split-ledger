import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T082: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"有 JPY 15000 的住宿與 JPY 2000 的餐費', async ({ world }) => {
 await b.trip(world); await b.expense(world,'住宿','15000'); await b.expense(world,'餐費','2000');
});
