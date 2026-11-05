import { Then, expect } from '../../support/fixtures.js';
import { rows, named, apiItems } from '../../support/accounts-categories-trips.js';
import type { Row } from '../../support/accounts-categories-trips.js';

Then('原分類仍為同一個分類', async ({ page, world }) => {
  await expect(page.getByRole('dialog')).toBeHidden();
  const before = world.get<Row[]>('category:before');
  expect(await rows(world, 'categories')).toHaveLength(before.length);
  const original = before.find(row => row.name === '餐飲')!;
  expect((await named(world, 'categories', '餐飲')).id).toBe(original.id);
  expect((await apiItems(world, '/api/categories')).find(row => row.id === original.id)).toMatchObject({ name: '餐飲' });
  await expect(page.getByText('餐飲', { exact: true })).toBeVisible();
});
