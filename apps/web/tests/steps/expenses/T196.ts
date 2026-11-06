import { Then, expect } from '../../support/fixtures.js';
import { rows, noCreation, assertDraft } from '../../support/expense-helpers.js';

Then('畫面提示正數金額且午餐支出未新增', async ({ page, world }) => {
  await expect(page.getByText(/正數|大於零/).first()).toBeVisible();
  await assertDraft(page, world);
  await noCreation(world);
  expect((await rows(world)).some((x) => x.item === '午餐')).toBe(false);
});
