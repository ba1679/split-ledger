import { Then, expect } from '../../../support/fixtures.js';
import type { ThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { assertManagementUnchanged } from '../../../support/trips/management-assertions.js';

Then('縮圖草稿仍為 {string} 且遠端未變', async ({ world }, selected: string) => {
  const draft = world.get<ThumbnailDraft>('management:draft');
  const cancelled = world.get<{
    events: string[];
    sameReferences: boolean;
    before: unknown[];
    after: unknown[];
    sources: (string | null)[];
  }>('management:cancelledChooser');
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  expect(draft.name).toBe(selected);
  expect(cancelled.events).toEqual(['cancel']);
  expect(cancelled.sameReferences).toBe(true);
  expect(cancelled.after).toEqual(cancelled.before);
  await expect(dialog).toBeVisible();
  expect(
    await dialog
      .locator('img:visible')
      .evaluateAll((images) => images.map((image) => image.getAttribute('src'))),
  ).toEqual(cancelled.sources);
  await expect(dialog.getByText('神社照片.png', { exact: true })).toBeHidden();
  if (selected === '富士山') {
    expect(draft.intent).toBe('keep');
    const image = dialog.locator('img:visible');
    const rendered = await renderedImage(image);

    expect(rendered.width).toBe(64);
    expect(rendered.height).toBe(48);
    for (const [index, value] of [109, 143, 172, 255].entries())
      expect(Math.abs(rendered.rgba[index]! - value)).toBeLessThanOrEqual(5);
    const url = await image.getAttribute('src');
    const bytes = await page.evaluate(
      async (src) => [...new Uint8Array(await (await fetch(src)).arrayBuffer())],
      url!,
    );

    expect(Buffer.from(bytes)).toEqual(world.get('management:originalImage'));
  } else {
    expect(selected).toBe('預設圖');
    expect(draft.intent).toBe('reset');
    await expect(dialog.getByText(/^(?:預設圖|預設旅行縮圖)$/)).toBeVisible();
    await expect(dialog.locator('img[src^="blob:"]:visible')).toHaveCount(0);
    await expect(dialog.getByText('尚未保存', { exact: true })).toBeVisible();
  }
  await assertManagementUnchanged(world);
});
