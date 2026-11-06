import { Then, expect } from '../../support/fixtures.js';
import { openTrip, assertExpensesUnchanged } from '../../support/accounts-categories-trips.js';

Then('原支出仍存在', async ({ page, world }) => {
  await assertExpensesUnchanged(world);
  for (const name of ['日本旅行', '台南旅行']) {
    await openTrip(page, world, name);
    const item = name === '日本旅行' ? '午餐' : '晚餐';

    await expect(page.getByRole('link').filter({ hasText: item })).toBeVisible();
  }
});
