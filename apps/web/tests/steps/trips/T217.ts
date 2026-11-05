import { Then, expect } from '../../support/fixtures.js';
import { assertTrip } from '../../support/accounts-categories-trips.js';

Then('使用者看到 "台南旅行" 的未定開始日與結束日', async ({ page, world }) => {
  await assertTrip(world, '台南旅行', null, '2027-04-05');
  await expect(page.getByText(/開始日未定/)).toBeVisible();
  await expect(page.getByText(/2027[/-]04[/-]05/)).toBeVisible();
});
