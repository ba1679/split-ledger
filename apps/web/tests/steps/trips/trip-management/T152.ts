import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import {
  assertNewTripFields,
  assertNewTripNotCreated,
} from '../../../support/trips/uncommitted-new-trip.js';

Then('選圖錯誤阻止建立且保留可修正內容', async ({ world }) => {
  const ui = managementUI(world),
    dialog = ui.page.getByRole('dialog');
  const act = world.get<{ fields: { name: string; start: string; end: string }; writes: number }>(
    'management:invalidNewTripSubmit',
  );
  expect(act.writes).toBe(0);
  await expect(dialog).toBeVisible();
  const error = dialog.getByRole('alert').filter({ hasText: /HEIC/i });
  await expect(error).toBeVisible();
  await expect(error).toContainText(/轉|JPG|JPEG|PNG|WebP/i);
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '移除選圖', exact: true })).toBeEnabled();
  for (const [label, value] of [
    [/^旅行名稱$/, act.fields.name],
    [/^開始日/, act.fields.start],
    [/^結束日/, act.fields.end],
  ] as const)
    await expect(dialog.getByRole('textbox', { name: label })).toHaveValue(value);
  await assertNewTripFields(world);
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(
    ui.page.getByRole('status').filter({ hasText: /建立成功|旅行已建立|圖片已保存/ }),
  ).toBeHidden();
  await assertNewTripNotCreated(world);
  expect(ui.writes.length).toBe(0);
});
