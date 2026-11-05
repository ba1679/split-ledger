import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T037: exact authoritative backend DSL registration.
When('使用者"甲"將"餐飲"改名為只有空白', async ({ world }) => {
 await b.renameCategory(world,'   ');
});
