import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { OwnedWriteRejection } from '../../../../api/tests/support/trip-management/write-rejection.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import type { ThumbnailDraft } from './draft-fixture.js';
import { observedThumbnailCommand } from './browser-command.js';
import { renderedImage } from './rendered-image.js';
import { managementUI } from '../trips/management-fixture.js';
import { assertManagementUnchanged } from '../trips/management-assertions.js';

export async function assertThumbnailFailure(world: LedgerWorld, selected: string): Promise<void> {
  const { response, command, start } = await observedThumbnailCommand(world, selected);
  const fault = world.get<OwnedWriteRejection>('management:thumbnailFault');

  expect(
    await fault.attempts(),
    'The real thumbnail write must reach the scoped constraint rejection',
  ).toBe(1);
  expect(response.status()).toBe(400);
  const error = await response.json();

  expect(error).toMatchObject({ code: 'VALIDATION_ERROR', message: expect.any(String) });
  expect(error.message.length).toBeGreaterThan(0);
  expect(JSON.stringify(error)).not.toMatch(/23514|test_reject_|006 isolated/);
  const before = world.get('management:before');

  expect(await managementSnapshot(world)).toEqual(before);
  const receipt = await ownerRead(
    world,
    `/api/trips/${command.tripId}/operations/${command.operationId}`,
  );

  expect(receipt.status()).toBe(404);
  expect(await receipt.json()).toMatchObject({ code: 'OPERATION_NOT_FOUND' });
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText(/失敗|未|不正確|不能|無法/);
  await expect(dialog.getByRole('alert')).not.toContainText(/結果.*(?:未知|尚未確認)|查證中/);
  await expect(dialog.getByText('VALIDATION_ERROR', { exact: true })).toBeHidden();
  await expect(dialog.getByRole('button', { name: '保存圖片', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: '保存圖片', exact: true })).not.toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: /保存成功|已更新縮圖|圖片已保存/ }),
  ).toBeHidden();
  const draft = world.get<ThumbnailDraft>('management:draft');

  expect(draft.name).toBe(selected);
  if (selected === '神社照片') {
    expect(draft.intent).toBe('save');
    await expect(dialog.getByText(draft.file!.name, { exact: true })).toBeVisible();
    const image = dialog.locator('img[src^="blob:"]:visible');
    expect(await renderedImage(image)).toEqual({
      width: 64,
      height: 48,
      rgba: [67, 140, 161, 255],
    });
    const source = await image.getAttribute('src');
    const bytes = await page.evaluate(
      async (url) => [...new Uint8Array(await (await fetch(url)).arrayBuffer())],
      source!,
    );
    expect(Buffer.from(bytes)).toEqual(draft.file!.bytes);
  } else {
    expect(selected).toBe('預設圖');
    expect(draft.intent).toBe('reset');
    await expect(dialog.getByText(/^(?:預設圖|預設旅行縮圖)$/)).toBeVisible();
    await expect(dialog.locator('img[src^="blob:"]:visible')).toHaveCount(0);
  }
  await assertManagementUnchanged(world, start + 1);
  world.set('management:failedThumbnailOperationId', command.operationId);
  world.set('management:thumbnailFailureObserved', true);
}
