import { Then, expect } from '../../support/fixtures.js';
import { rows, named, apiItems } from '../../support/accounts-categories-trips.js';
import type { Row } from '../../support/accounts-categories-trips.js';

Then('分類建立成功', async ({ page, world }) => {
  const name = world.get<string>('category:input').trim();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  const current = await rows(world, 'categories');

  expect(current).toHaveLength(world.get<Row[]>('category:before').length + 1);
  const created = await named(world, 'categories', name);

  expect(
    (await apiItems(world, '/api/categories')).find((row) => row.id === created.id),
  ).toMatchObject({ name });
});
