import { Given, expect } from '../../support/fixtures.js';
import {
  seedCategory,
  openExpenseForm,
  categoryPreference,
} from '../../support/accounts-categories-trips.js';

Given('支出表單預選 "交通" 且其餘必填欄位已填妥', async ({ page, world }) => {
  const category = await seedCategory(world, '交通');

  await categoryPreference(page, world, category.id);
  await openExpenseForm(page, world);
  await expect(page.getByRole('combobox', { name: /分類/ })).toHaveValue('交通');
  await page.getByLabel('支出項目', { exact: true }).fill('午餐');
  await page.getByLabel('支出金額', { exact: true }).fill('1200');
  await page.getByRole('combobox', { name: '幣別', exact: true }).fill('JPY');
  await page.getByRole('option', { name: /JPY/ }).click();
  await page.getByLabel('支出日期', { exact: true }).fill('2027/03/11');
});
