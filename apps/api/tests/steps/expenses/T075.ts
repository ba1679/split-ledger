import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T075: exact authoritative backend DSL registration.
Given('使用者"甲"在手機工作階段已保存"日本旅行"的 JPY 1200 午餐', async ({ world }) => {
 await b.trip(world); await b.expense(world,'午餐','1200');
 await b.prepareSecondDevice(world);
});
