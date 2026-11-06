import { Then, expect } from '../../support/fixtures.js';
import { assertTrip } from '../../support/accounts-categories-trips.js';

Then('畫面提示日期順序錯誤且原旅行日期維持不變', async ({ page, world }) => {
  await expect(page.getByRole('dialog').getByText(/結束日不能早於開始日|日期順序/)).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('結束日', { exact: true })).toHaveValue(
    '2027/03/09',
  );
  await assertTrip(world, '日本旅行', '2027-03-10', null);
});
