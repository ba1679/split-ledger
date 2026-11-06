import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T030: exact authoritative backend DSL registration.
Then('30 字分類已保存', async ({ world }) => {
  await b.savedCategory(world, '餐'.repeat(30));
});
