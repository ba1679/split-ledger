import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { createImageAssets } from '../../../../api/tests/support/trip-management/image-assets.js';
import {
  generateExactImage,
  type UploadImage,
} from '../../../../api/tests/support/trip-management/generated-images.js';
import { managementUI } from '../trips/management-fixture.js';
import { observeObjectUrls, objectUrls, restoreObjectUrls } from './object-urls.js';

export interface ThumbnailDraft {
  name: '神社照片' | '預設圖' | '富士山';
  intent: 'save' | 'reset' | 'keep';
  file?: UploadImage;
  url?: string;
}

export async function observeDraftUrls(world: LedgerWorld): Promise<void> {
  const { page } = managementUI(world);
  if (!world.state.has('management:urlObserver')) {
    await observeObjectUrls(page);
    world.set('management:urlObserver', true);
    world.tripManagement.cleanups.add(async () => {
      await restoreObjectUrls(page);
    });
  }
}

export async function selectThumbnailDraft(world: LedgerWorld, selected: string): Promise<void> {
  expect(['神社照片', '預設圖', '富士山']).toContain(selected);
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  await expect(dialog).toBeVisible();
  await observeDraftUrls(world);
  if (selected === '富士山') {
    world.set('management:draft', { name: selected, intent: 'keep' } satisfies ThumbnailDraft);

    return;
  }
  if (selected === '預設圖') {
    await dialog.getByRole('button', { name: '使用預設圖', exact: true }).click();
    await expect(dialog.locator('img[src^="blob:"]:visible')).toHaveCount(0);
    world.set('management:draft', { name: selected, intent: 'reset' } satisfies ThumbnailDraft);

    return;
  }
  if (selected !== '神社照片') throw new Error(`Unsupported thumbnail draft: ${selected}`);
  const workspace = await createImageAssets();
  world.tripManagement.cleanups.add(async () => {
    await workspace.dispose();
  });
  const bytes = await generateExactImage('PNG', 65536, 64, 48);
  const name = '神社照片.png';
  const asset = await workspace.write(name, bytes);
  const file: UploadImage = { name, mimeType: 'image/png', bytes, asset };
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ }).click(),
  ]);

  await chooser.setFiles(asset.path);
  await expect(dialog.getByText(name, { exact: true })).toBeVisible();
  const preview = dialog.locator('img[src^="blob:"]:visible');

  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveJSProperty('complete', true);
  await expect(preview).toHaveJSProperty('naturalWidth', 64);
  await expect(preview).toHaveJSProperty('naturalHeight', 48);
  const url = await preview.getAttribute('src');
  const records = await objectUrls(page);

  expect(records.find((record) => record.url === url)).toMatchObject({
    size: bytes.length,
    type: 'image/png',
    revoked: false,
  });
  world.set('management:draft', {
    name: selected,
    intent: 'save',
    file,
    url: url!,
  } satisfies ThumbnailDraft);
}

export async function arrangeThumbnailDraft(world: LedgerWorld, selected: string): Promise<void> {
  // Exercise replacing a selected photo with the default without submitting either intent.
  if (selected === '預設圖') await selectThumbnailDraft(world, '神社照片');
  await selectThumbnailDraft(world, selected);
  expect(managementUI(world).writes).toEqual([]);
}
