import { Then, expect } from '../../support/fixtures.js';
import { expenseLink, assertTotal, readLedger, unchanged } from '../../support/expense-helpers.js';

Then('畫面增加下一頁支出且分幣別總額仍涵蓋全帳本', async ({ page, world }) => {
  await expect(page.getByRole('link').filter({ hasText: /跨頁支出\d+/ })).toHaveCount(21);
  await expect(expenseLink(page, '跨頁支出01')).toBeVisible();
  expect((await readLedger(world)).list.totalCount).toBe(21);
  await assertTotal(page, world, 'TWD', '9000');
  await assertTotal(page, world, 'JPY', '5000');
  expect(world.get<number>('expense:totalRequests')).toBe(0);
  await unchanged(world);
});
