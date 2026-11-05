import { Then, expect } from '../../support/fixtures.js';
import { rows, named, apiItems } from '../../support/accounts-categories-trips.js';

Then('目前帳號的 "交通" 分類建立成功', async ({ page, world }) => {
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('交通', { exact: true })).toBeVisible();
  const mine = await named(world, 'categories', '交通');
  const other = await named(world, 'categories', '交通', '乙');
  expect(mine.id).not.toBe(other.id);
  const visible = await apiItems(world, '/api/categories');
  expect(visible.map(row => row.id)).toEqual([mine.id]);
  expect(await rows(world, 'categories', '乙')).toHaveLength(1);
});
