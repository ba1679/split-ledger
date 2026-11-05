import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T047: exact authoritative backend DSL registration.
When('使用者"甲"清除午餐的分類', async ({ world }) => {
 await b.clearCategory(world);
});
