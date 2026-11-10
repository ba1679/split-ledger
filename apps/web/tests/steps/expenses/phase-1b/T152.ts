import { When } from '../../../support/fixtures.js';
import { viewExpenseShares } from '../../../support/splitting/view-expense-shares.js';

When('owner 查看支出 {string} 的分攤', async ({ page, world }, item: string) => {
  await viewExpenseShares(page, world, item);
});
