import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('畫面進入縮圖編輯且尚未保存', async ({ world }) => {
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/自訂旅行縮圖/);
  await expect(dialog).toHaveAccessibleDescription(/日本旅行/);
  await expect(dialog.getByRole('button', { name: '保存圖片', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeVisible();
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByRole('button', { name: /永久刪除|移至垃圾桶/ })).toHaveCount(0);
  await assertManagementUnchanged(world);
});
