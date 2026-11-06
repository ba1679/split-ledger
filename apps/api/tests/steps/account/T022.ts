import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T022: exact authoritative backend DSL registration.
Then('分類查詢回覆找不到且不揭露甲的資料', async ({ world }) => {
  await b.deniedResource(world, 'category');
});
