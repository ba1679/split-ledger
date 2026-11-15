import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { UploadImage } from '../../../../api/tests/support/trip-management/generated-images.js';
import { managementUI } from '../trips/management-fixture.js';
import { observeDraftUrls, type ThumbnailDraft } from './draft-fixture.js';
import { observedThumbnailCommand } from './browser-command.js';

export async function savePreparedFile(world: LedgerWorld, file: UploadImage): Promise<void> {
  const { page } = managementUI(world),
    dialog = page.getByRole('dialog');
  await observeDraftUrls(world);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ }).click(),
  ]);
  await chooser.setFiles(file.asset.path);
  await expect(dialog.getByText(file.name, { exact: true })).toBeVisible();
  const preview = dialog.locator('img[src^="blob:"]:visible');
  await expect(preview).toHaveCount(1);
  await expect
    .poll(() =>
      preview.evaluate(async (element) => {
        if (!(element instanceof HTMLImageElement)) return false;
        await element.decode();

        return element.naturalWidth > 0 && element.naturalHeight > 0;
      }),
    )
    .toBe(true);
  const url = (await preview.getAttribute('src'))!;
  const hash = await page.evaluate(async (url) => {
    const bytes = await (await fetch(url)).arrayBuffer();

    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }, url);
  expect(hash).toBe(file.asset.sha256);
  await expect(dialog.getByText('尚未保存', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
  world.set('management:draft', {
    name: '神社照片',
    intent: 'save',
    file,
    url,
  } satisfies ThumbnailDraft);
  const save = dialog.getByRole('button', { name: '保存圖片', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  const observed = await observedThumbnailCommand(world, '神社照片');
  expect(observed.response.status()).toBe(200);
  world.set('management:preparedThumbnailSaved', observed);
}
