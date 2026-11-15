import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('畫面進入移入確認且尚未保存', async ({ world }) => {
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: '移至垃圾桶', exact: true });

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/日本旅行.*垃圾桶/);
  await expect(dialog).toHaveAccessibleDescription(/保留.*帳務/s);
  await expect(dialog).toHaveAccessibleDescription(/復原/);
  await expect(dialog).toHaveAccessibleDescription(/不會結清欠款/);
  await expect(confirm).toBeVisible();
  await expect(confirm).not.toBeFocused();
  await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeVisible();
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await assertManagementUnchanged(world);
});
