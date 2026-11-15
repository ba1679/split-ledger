import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import {
  assertNewTripFields,
  assertNewTripNotCreated,
  type NewTripSelection,
} from '../../../support/trips/uncommitted-new-trip.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';

Then('新增表單顯示尚未保存預覽且沒有旅行資料', async ({ world }) => {
  const selected = world.get<NewTripSelection>('management:newTripSelection');
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  expect(selected.photo).toBe('合法神社');
  expect(selected.file).toBeDefined();
  await expect(dialog).toHaveAccessibleName('新增旅行');
  await expect(dialog.getByText('尚未保存', { exact: true })).toBeVisible();
  await expect(dialog.getByText(selected.file!.name, { exact: true })).toBeVisible();
  const image = dialog.locator('img[src^="blob:"]:visible');

  expect(await renderedImage(image)).toEqual({ width: 64, height: 48, rgba: [67, 140, 161, 255] });
  const source = await image.getAttribute('src');
  const bytes = await page.evaluate(
    async (url) => [...new Uint8Array(await (await fetch(url)).arrayBuffer())],
    source!,
  );

  expect(Buffer.from(bytes)).toEqual(selected.file!.bytes);
  await assertNewTripFields(world);
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '移除選圖', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: '取消', exact: true }).click({ trial: true });
  await assertNewTripNotCreated(world);
});
