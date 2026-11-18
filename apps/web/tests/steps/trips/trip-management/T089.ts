import { Then, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('縮圖編輯顯示富士山而非已放棄草稿', async ({ world }) => {
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const abandoned = world.get<{ filename: string }>('management:abandonedDraft');

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/自訂旅行縮圖/);
  const image = dialog.locator('img:visible');
  const rendered = await renderedImage(image);

  expect(rendered.width).toBe(64);
  expect(rendered.height).toBe(48);
  for (const [index, value] of [109, 143, 172, 255].entries())
    expect(Math.abs(rendered.rgba[index]! - value)).toBeLessThanOrEqual(5);
  const source = await image.getAttribute('src');

  expect(source).toBeTruthy();
  const bytes = await page.evaluate(
    async (url) => [...new Uint8Array(await (await fetch(url)).arrayBuffer())],
    source!,
  );

  expect(Buffer.from(bytes)).toEqual(world.get('management:originalImage'));
  await expect(dialog.getByText(abandoned.filename, { exact: true })).toBeHidden();
  await expect(dialog.getByText(/^(?:預設圖|預設旅行縮圖)$/)).toBeHidden();
  await expect(dialog.getByText('尚未保存', { exact: true })).toBeHidden();
  await assertManagementUnchanged(world);
});
