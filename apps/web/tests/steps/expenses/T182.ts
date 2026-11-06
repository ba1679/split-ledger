import { When } from '../../support/fixtures.js';
import { openTrip } from '../../support/browser.js';

When('使用者查看 "日本旅行" 帳本', async ({ page, world }) => {
  await openTrip(page, world);
});
