import { When, expect } from '../../support/fixtures.js';
import { login } from '../../support/accounts-categories-trips.js';

When('使用者在電腦查看旅行清單', async ({ page, world }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, world);
  await page.goto('/trips');
  await expect(page.getByRole('button', { name: '新增旅行', exact: true })).toBeVisible();
});
