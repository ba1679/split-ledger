import { Given, expect } from '../../support/fixtures.js';
import { seedExpense, login, openTrip, snapshot } from '../../support/accounts-categories-trips.js';

Given('午餐支出已關聯 "吃喝" 分類', async ({ page, world }) => {
  await seedExpense(world, { item: '午餐', amount: '1200', categoryName: '吃喝' });
  await snapshot(world);
  await login(page, world);
  await openTrip(page, world);
  await page.getByRole('link').filter({ hasText: '午餐' }).click();
  await expect(page.getByRole('combobox', { name: /分類/ })).toHaveValue('吃喝');
});
