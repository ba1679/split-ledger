import { Given, expect } from '../../support/fixtures.js';
import { draft } from '../../support/expense-helpers.js';

Given('使用者已填妥支出且裝置離線', async ({ page, world }) => {
  await draft(page, world);
  await page.context().setOffline(true);
  world.set('expense:offline', true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});
