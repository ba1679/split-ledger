import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T032: exact authoritative backend DSL registration.
When('使用者"甲"刪除"吃喝"分類', async ({ world }) => {
 await b.deleteCategory(world);
});
