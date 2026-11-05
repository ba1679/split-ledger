import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T046: exact authoritative backend DSL registration.
When('使用者"甲"查詢分類"餐飲"', async ({ world }) => {
 await b.request(world,'GET',`/api/categories/${b.id(world,'category')}`);
});
