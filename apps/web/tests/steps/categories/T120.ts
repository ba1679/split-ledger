import { When, expect } from '../../support/fixtures.js';
import { waitForCategoryResult } from '../../support/accounts-categories-trips.js';

When('使用者刪除 "吃喝" 分類', async ({ page }) => {
  await page.getByRole('button', { name: '刪除：吃喝', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const confirm = page.getByRole('dialog').getByRole('button', { name: '確認刪除', exact: true });
  // The approved UI can explain a known usage conflict before issuing DELETE.
  if (await confirm.isVisible()) {
    await confirm.click();
    await waitForCategoryResult(page);
  }

  await expect(
    page
      .getByRole('dialog')
      .or(page.getByRole('status'))
      .or(page.getByRole('alert'))
      .filter({ hasText: /分類|吃喝/ })
      .first(),
  ).toBeVisible();
});
