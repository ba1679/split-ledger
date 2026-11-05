import { Then, expect } from '../../support/fixtures.js';
import { assertTrip, assertAccount } from '../../support/accounts-categories-trips.js';

Then('使用者看到已保存的 "日本旅行"', async ({ page, world }) => {
  await assertTrip(world, '日本旅行', null, null);
  await expect(page.getByRole('link').filter({ hasText: '日本旅行' })).toBeVisible();
  await assertAccount(page, world, '甲');
});
