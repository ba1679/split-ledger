import { Then, expect } from '../../support/fixtures.js';
import { assertTrip } from '../../support/accounts-categories-trips.js';

Then('畫面顯示旅行期間為 "2027-03-10" 至 "2027-03-15"', async ({ page, world }) => {
  await expect(page.getByRole('dialog')).toBeHidden();
  await assertTrip(world, '日本旅行', '2027-03-10', '2027-03-15');
  await expect(page.getByText(/2027[/-]03[/-]10.*2027[/-]03[/-]15/)).toBeVisible();
});
