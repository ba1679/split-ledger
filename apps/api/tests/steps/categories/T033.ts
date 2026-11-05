import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T033: exact authoritative backend DSL registration.
When('使用者"甲"將"餐飲"分類改名為"吃喝"', async ({ world }) => {
 await b.renameCategory(world,'吃喝');
});
