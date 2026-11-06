import { Then, expect } from '../../support/fixtures.js';
import { rows, apiItems, assertTrip } from '../../support/accounts-categories-trips.js';

Then('使用者看到 "日本旅行" 的空帳本與未定日期', async ({ page, world }) => {
  const trip = await assertTrip(world, '日本旅行', null, null);

  expect(trip.expenseCount).toBe(0);
  expect(await apiItems(world, `/api/trips/${trip.id}/expenses`)).toHaveLength(0);
  expect(await rows(world, 'expenses')).toHaveLength(0);
  await expect(page.getByText(/旅行日期未定|開始日未定/)).toBeVisible();
  await expect(page.getByRole('link', { name: /記錄第一筆支出|新增第一筆支出/ })).toBeVisible();
});
