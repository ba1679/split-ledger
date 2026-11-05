import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T036: exact authoritative backend DSL registration.
When('使用者"甲"將"餐飲"改名為"餐飲"', async ({ world }) => {
 await b.renameCategory(world,'餐飲');
});
