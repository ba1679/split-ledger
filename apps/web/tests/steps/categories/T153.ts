import { Then, expect } from '../../support/fixtures.js';
import { rows, apiItems } from '../../support/accounts-categories-trips.js';

Then('表單沒有預選分類', async ({ page, world }) => {
  await expect(page.getByRole('combobox', { name: /分類/ })).toHaveValue(/^(未分類)?$/);
  expect(world.get<string[]>('web:formWrites')).toEqual([]);
  expect(await rows(world, 'expenses')).toEqual(world.get('expense:before'));
  await apiItems(world, '/api/categories');
});
