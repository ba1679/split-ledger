import { Given } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T050: exact authoritative backend DSL registration.
Given('使用者"甲"的"日本旅行"有歸入"吃喝"的午餐', async ({ world }) => {
 await b.categoryWithExpenses(world,'吃喝',true,1);
});
