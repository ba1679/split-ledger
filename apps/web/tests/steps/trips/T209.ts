import { Given } from '../../support/fixtures.js';
import { seedTrip, login, openTrip, assertTrip } from '../../support/accounts-categories-trips.js';

Given('"日本旅行" 已有開始日 "2027-03-10" 且未填結束日', async ({ page, world }) => {
  await seedTrip(world, '日本旅行', '甲', { startDate: '2027-03-10', endDate: null });
  await login(page, world); await openTrip(page, world);
  await assertTrip(world, '日本旅行', '2027-03-10', null);
});
