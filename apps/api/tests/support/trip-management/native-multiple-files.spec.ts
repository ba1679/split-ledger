import { test, expect } from '@playwright/test';
import { createImageAssets } from './image-assets.js';
import { generateExactImage, type UploadImage } from './generated-images.js';
import { injectMultipleFiles } from '../../../../web/tests/support/thumbnail/multiple-files.js';

test('native FileList injection exposes two genuine files while single-file input remains unchanged', async ({
  page,
}) => {
  const workspace = await createImageAssets();
  try {
    const files: UploadImage[] = [];
    for (const [index, format] of ['JPEG .jpg', 'PNG'].entries()) {
      const bytes = await generateExactImage(format, 65536, index ? 48 : 64, index ? 64 : 48);
      const name = index ? 'second.png' : 'first.jpg';
      files.push({
        name,
        mimeType: index ? 'image/png' : 'image/jpeg',
        bytes,
        asset: await workspace.write(name, bytes),
      });
    }
    await page.setContent(
      '<button onclick="document.querySelector(\'input\').click()">Pick</button><input type="file" accept="image/jpeg,image/png" hidden>',
    );
    await page.locator('input').evaluate((element) =>
      element.addEventListener('change', () => {
        document.body.dataset.count = String((element as HTMLInputElement).files!.length);
      }),
    );
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Pick' }).click(),
    ]);
    expect(chooser.isMultiple()).toBe(false);
    await injectMultipleFiles(chooser.element(), files);
    await expect(page.locator('body')).toHaveAttribute('data-count', '2');
    await expect(page.locator('input')).not.toHaveAttribute('multiple');
  } finally {
    await workspace.dispose();
  }
});
