import { When, expect } from '../../support/fixtures.js';
import { openTrip, named, apiItems } from '../../support/accounts-categories-trips.js';

When('使用者查看兩趟旅行的支出', async ({ page, world }) => {
  for (const name of ['日本旅行', '台南旅行']) {
    await openTrip(page, world, name);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    const trip = await named(world, 'trips', name);
    expect(await apiItems(world, `/api/trips/${trip.id}/expenses`)).toHaveLength(1);
  }
});
