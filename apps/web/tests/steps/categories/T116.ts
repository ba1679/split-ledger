import { Then, expect } from '../../support/fixtures.js';
import { openExpenseForm, rows, apiItems } from '../../support/accounts-categories-trips.js';

Then('"吃喝" 不再可選', async ({ page, world }) => {
  expect((await rows(world, 'categories')).find(row => row.name === '吃喝')).toBeUndefined();
  expect((await apiItems(world, '/api/categories')).find(row => row.name === '吃喝')).toBeUndefined();
  await openExpenseForm(page, world);
  await page.getByRole('combobox', { name: /分類/ }).click();
  await expect(page.getByRole('option', { name: '吃喝', exact: true })).toHaveCount(0);
});
