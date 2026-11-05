import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T035: exact authoritative backend DSL registration.
When('使用者"甲"將"餐飲"改名為"food"', async ({ world }) => {
 await b.renameCategory(world,'food');
});
