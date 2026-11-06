import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T052: exact authoritative backend DSL registration.
Then('兩筆支出顯示"吃喝"且仍關聯原分類', async ({ world }) => {
  await b.renamedCategory(world);
});
