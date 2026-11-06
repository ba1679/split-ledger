import { When } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T012: exact authoritative backend DSL registration.
When('使用者"乙"查詢"餐飲"分類', async ({ world }) => {
  await b.request(world, 'GET', `/api/categories/${b.id(world, 'category')}`, undefined, '乙');
});
