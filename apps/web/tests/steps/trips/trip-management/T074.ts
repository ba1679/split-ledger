import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('確認內容說明 {string}', async ({ world }, consequence: string) => {
  expect(['移入可復原', '永久刪除不可復原']).toContain(consequence);
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const permanent = consequence === '永久刪除不可復原';
  const primary = dialog.getByRole('button', {
    name: permanent ? '永久刪除' : '移至垃圾桶',
    exact: true,
  });
  const cancel = dialog.getByRole('button', { name: '取消', exact: true });

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(permanent ? /永久刪除.*日本旅行/ : /日本旅行.*垃圾桶/);
  if (permanent) {
    for (const term of ['整趟旅行', '同行者', '支出', '還款', '結清', '縮圖', '無法復原'])
      await expect(dialog).toHaveAccessibleDescription(new RegExp(term));
  } else {
    await expect(dialog).toHaveAccessibleDescription(/保留.*帳務/s);
    await expect(dialog).toHaveAccessibleDescription(/復原/);
  }
  await expect(primary).not.toBeFocused();
  await expect(cancel).toBeVisible();
  await expect(dialog.getByRole('button', { name: '關閉', exact: true })).toBeVisible();
  const cancelBox = await cancel.boundingBox(),
    primaryBox = await primary.boundingBox();

  expect(cancelBox).not.toBeNull();
  expect(primaryBox).not.toBeNull();
  expect(
    Math.abs(cancelBox!.y + cancelBox!.height / 2 - primaryBox!.y - primaryBox!.height / 2),
  ).toBeLessThanOrEqual(8);
  expect(primaryBox!.x - cancelBox!.x - cancelBox!.width).toBeGreaterThanOrEqual(0);
  expect(primaryBox!.x - cancelBox!.x - cancelBox!.width).toBeLessThanOrEqual(24);
  // The neutral cancel surface has very little chroma, unlike the main action.
  const background = await cancel.evaluate((button) => getComputedStyle(button).backgroundColor);
  const channels = background.match(/[\d.]+/g)!.map(Number);

  expect(channels.length).toBeGreaterThanOrEqual(3);
  expect(Math.max(...channels.slice(0, 3)) - Math.min(...channels.slice(0, 3))).toBeLessThanOrEqual(
    25,
  );
  await assertManagementUnchanged(world);
});
