import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { IncompleteUpload } from './incomplete-upload.js';
import type { ThumbnailDraft } from './draft-fixture.js';
import { observedThumbnailCommand } from './browser-command.js';
import { renderedImage } from './rendered-image.js';
import { managementUI } from '../trips/management-fixture.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';

export async function assertIncompleteUploadFailed(world: LedgerWorld): Promise<void> {
  const { response, command } = await observedThumbnailCommand(world, '神社照片');
  const fault = world.get<IncompleteUpload>('management:incompleteUpload');
  const draft = world.get<ThumbnailDraft>('management:draft');
  expect(fault.errors.map(String)).toEqual([]);
  expect(fault.attempts).toHaveLength(1);
  expect(fault.attempts[0]!.operationId).toBe(command.operationId);
  expect(fault.attempts[0]!.forwardedBytes).toBeLessThan(draft.file!.bytes.length);
  // Only a definitive formal rejection qualifies; a transport error/receipt404 alone does not.
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    code: 'VALIDATION_ERROR',
    message: expect.any(String),
  });
  const receipt = await ownerRead(
    world,
    `/api/trips/${command.tripId}/operations/${command.operationId}`,
  );
  expect(receipt.status()).toBe(404);
  expect(await receipt.json()).toMatchObject({ code: 'OPERATION_NOT_FOUND' });
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const alert = dialog
    .getByRole('alert')
    .filter({ hasText: /(?:上傳|圖片)[^。]*(?:未保存|中斷|未完成|失敗)/ });
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText(/尚未確認|結果未知|查證中/);
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '保存圖片', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await expect(dialog.getByText(draft.file!.name, { exact: true })).toBeVisible();
  const preview = dialog.locator('img[src^="blob:"]:visible');
  expect(await renderedImage(preview)).toEqual({
    width: 64,
    height: 48,
    rgba: [67, 140, 161, 255],
  });
  const url = await preview.getAttribute('src');
  expect(url).toBe(draft.url);
  const bytes = await page.evaluate(
    async (url) => [...new Uint8Array(await (await fetch(url)).arrayBuffer())],
    url!,
  );
  expect(Buffer.from(bytes)).toEqual(draft.file!.bytes);
  await expect(page.getByRole('status').filter({ hasText: /圖片已保存|保存成功/ })).toBeHidden();
  await assertManagementUnchanged(world, 1);
}
