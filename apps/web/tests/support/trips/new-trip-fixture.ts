import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { UploadImage } from '../../../../api/tests/support/trip-management/generated-images.js';
import { selectInvalidImage } from '../../../../api/tests/support/trip-management/invalid-images.js';
import { managementUI } from './management-fixture.js';
import {
  selectThumbnailDraft,
  observeDraftUrls,
  type ThumbnailDraft,
} from '../thumbnail/draft-fixture.js';
import { assertManagementUnchanged } from './management-assertions.js';

export interface NewTripDraft {
  name: string;
  startDate: null;
  endDate: null;
  photo: '無' | '合法神社' | '不合法HEIC';
  file?: UploadImage;
}

export async function selectNewTripPhoto(
  world: LedgerWorld,
  photo: string,
): Promise<UploadImage | undefined> {
  expect(['無', '合法神社', '不合法HEIC']).toContain(photo);
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  await expect(dialog).toHaveAccessibleName('新增旅行');
  if (photo === '無') {
    await expect(dialog.locator('img[src^="blob:"]:visible')).toHaveCount(0);

    return undefined;
  }
  if (photo === '合法神社') {
    await selectThumbnailDraft(world, '神社照片');

    return world.get<ThumbnailDraft>('management:draft').file!;
  }
  await observeDraftUrls(world);
  await selectInvalidImage(world, 'HEIC');
  const file = world.get<UploadImage[]>('management:uploadFiles')[0]!;
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ }).click(),
  ]);

  await chooser.setFiles(file.asset.path);
  const error = dialog.getByRole('alert').filter({ hasText: /HEIC/i });
  await expect(error).toBeVisible();
  await expect(error).toContainText(/JPG|JPEG|PNG|WebP/i);
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeDisabled();

  return file;
}

export async function arrangeNewTripDraft(world: LedgerWorld, photo: string): Promise<void> {
  expect(['無', '合法神社', '不合法HEIC']).toContain(photo);
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const ownerId = world.users.get('Alice')!.id;

  expect(
    (
      await world.db.query('SELECT id FROM trips WHERE owner_id=$1 AND name=$2', [
        ownerId,
        '京都賞楓',
      ])
    ).rows,
  ).toEqual([]);
  await dialog.getByRole('textbox', { name: '旅行名稱', exact: true }).fill('京都賞楓');
  await expect(dialog.getByRole('textbox', { name: /^開始日/ })).toHaveValue('');
  await expect(dialog.getByRole('textbox', { name: /^結束日/ })).toHaveValue('');
  const file = await selectNewTripPhoto(world, photo);
  const draft: NewTripDraft = {
    name: '京都賞楓',
    startDate: null,
    endDate: null,
    photo: photo as NewTripDraft['photo'],
    ...(file ? { file } : {}),
  };

  world.set('management:newTripDraft', draft);
  world.set(
    'management:newTripIdsBefore',
    (
      await world.db.query('SELECT id FROM trips WHERE owner_id=$1 ORDER BY id', [ownerId])
    ).rows.map((row: { id: string }) => row.id),
  );
  await assertManagementUnchanged(world);
}
