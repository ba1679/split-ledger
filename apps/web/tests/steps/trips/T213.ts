import { Given, expect } from '../../support/fixtures.js';
import { login, apiItems } from '../../support/accounts-categories-trips.js';

Given('使用者已登入且在旅行清單', async ({ page, world }) => {
  await login(page, world);
  await page.goto('/trips');
  await expect(page.getByRole('button', { name: '新增旅行', exact: true })).toBeVisible();
  expect(await apiItems(world, '/api/trips')).toHaveLength(0);
});
