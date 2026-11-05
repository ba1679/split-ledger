import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T085: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"有"住宿"支出', async ({ world }) => {
 await b.trip(world); await b.expense(world,'住宿','15000');
});
