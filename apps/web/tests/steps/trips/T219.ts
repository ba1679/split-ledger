import { Then, expect } from '../../support/fixtures.js';
import { assertTrip } from '../../support/accounts-categories-trips.js';

Then('使用者看到 "日本旅行" 的開始日與未定結束日', async ({ page, world }) => {
  await assertTrip(world, '日本旅行', '2027-03-10', null);
  await expect(page.getByText(/2027[/-]03[/-]10/)).toBeVisible();
  await expect(page.getByText(/結束日未定/)).toBeVisible();
});
