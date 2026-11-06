import { When } from '../../support/fixtures.js';
import { login, openTrip } from '../../support/browser.js';

When('使用者在電腦查看該旅行帳本', async ({ page, world }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, world);
  await openTrip(page, world);
});
