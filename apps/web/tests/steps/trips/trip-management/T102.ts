import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import {
  assertNewTripFields,
  assertNewTripNotCreated,
  type NewTripSelection,
} from '../../../support/trips/uncommitted-new-trip.js';

Then('新增表單說明選圖錯誤並阻止帶錯誤直接建立', async ({ world }) => {
  const selected = world.get<NewTripSelection>('management:newTripSelection');
  const dialog = managementUI(world).page.getByRole('dialog');
  const error = dialog.getByRole('alert').filter({ hasText: /HEIC/i });

  expect(selected.photo).toBe('不合法HEIC');
  expect(selected.file!.mimeType).toBe('image/heic');
  await expect(error).toBeVisible();
  for (const format of [/JPG|JPEG/i, /PNG/i, /WebP/i]) await expect(error).toContainText(format);
  await expect(error).toContainText(/轉|改選|不支援/);
  await expect(error).not.toContainText(/UNSUPPORTED_IMAGE_TYPE|VALIDATION_ERROR/);
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '移除選圖', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeDisabled();
  await expect(dialog.locator('img[src^="blob:"]:visible')).toHaveCount(0);
  await assertNewTripFields(world);
  await assertNewTripNotCreated(world);
});
