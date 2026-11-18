import { Given, expect } from '../../../support/fixtures.js';
import { arrangeManagementPage, managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Given('owner 已在 {string} 開啟旅行選圖介面', async ({ page, world }, device: string) => {
  expect(['手機', '桌面電腦']).toContain(device);
  const viewport = device === '手機' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  await page.setViewportSize(viewport);
  await arrangeManagementPage(page, world, '縮圖編輯');
  expect(page.viewportSize()).toEqual(viewport);
  world.set('management:declaredDevice', device);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName(/自訂旅行縮圖/);
  await expect(dialog.locator('img[src^="blob:"]')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  expect(managementUI(world).writes.length).toBe(0);
  await assertManagementUnchanged(world);
});
