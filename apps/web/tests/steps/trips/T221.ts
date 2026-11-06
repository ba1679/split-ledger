import { Given, expect } from '../../support/fixtures.js';
import { seedTrip, login, assertAccount } from '../../support/accounts-categories-trips.js';

Given('同一 Google 帳號已在手機建立 "日本旅行"', async ({ page, world }) => {
  await seedTrip(world, '日本旅行');
  const mobile = await page
    .context()
    .browser()!
    .newContext({ baseURL: world.get<string>('webOrigin'), viewport: { width: 390, height: 844 } });

  try {
    const phone = await mobile.newPage();

    await login(phone, world);
    await phone.goto('/trips');
    await expect(phone.getByRole('link').filter({ hasText: '日本旅行' })).toBeVisible();
    await assertAccount(phone, world, '甲');
  } finally {
    await mobile.close();
  }
  expect(await page.context().cookies()).toHaveLength(0);
});
