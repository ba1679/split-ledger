import { Then } from '../../support/fixtures.js';
import * as b from '../../support/backend.js';

// T053: exact authoritative backend DSL registration.
Then('分類"餐飲"的使用筆數為 2 且兩筆支出屬於不同旅行', async ({ world }) => {
  await b.categoryUsage(world);
});
