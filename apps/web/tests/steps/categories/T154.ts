import { Then, expect } from '../../support/fixtures.js';
import { rows, named, apiItems } from '../../support/accounts-categories-trips.js';

Then('表單預選 "交通" 分類', async ({ page, world }) => {
  await expect(page.getByRole('combobox', { name: /分類/ })).toHaveValue('交通');
  expect(world.get<string[]>('web:formWrites')).toEqual([]);
  expect(await rows(world, 'expenses')).toEqual(world.get('expense:before'));
  const category = await named(world, 'categories', '交通');
  expect((await apiItems(world, '/api/categories')).some(row => row.id === category.id)).toBe(true);
});
