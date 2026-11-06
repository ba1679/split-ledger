import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T056: exact authoritative backend DSL registration.
Then('分類刪除被拒絕且分類與兩筆支出維持不變', async ({ world }) => {
  await b.unchangedCategories(world, 409, 'CATEGORY_IN_USE');
});
