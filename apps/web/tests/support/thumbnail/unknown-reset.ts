import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { arrangeThumbnailDraft } from './draft-fixture.js';
import { managementUI } from '../trips/management-fixture.js';
import { arrangeCommittedResponseLoss } from '../trips/committed-response-loss.js';
import { assertUnknownOutcome } from '../trips/unknown-result.js';

export async function arrangeUnknownReset(world: LedgerWorld): Promise<void> {
  await arrangeThumbnailDraft(world, '預設圖');
  const loss = await arrangeCommittedResponseLoss(world, '保存圖片');
  const { page } = managementUI(world);
  await page.getByRole('dialog').getByRole('button', { name: '保存圖片', exact: true }).click();
  await assertUnknownOutcome(world);
  expect(loss.request!.method()).toBe('DELETE');
  expect(loss.command!.kind).toBe('reset_thumbnail');
  expect(loss.after!.thumbnails).toEqual([]);
  expect(loss.outcome!.result).toMatchObject({
    operationId: loss.command!.operationId,
    kind: 'reset_thumbnail',
    thumbnailPresent: false,
  });
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    page.getByRole('dialog').getByRole('button', { name: '關閉', exact: true }),
  ).toBeEnabled();
  world.set('management:unknownReset', {
    operationId: loss.command!.operationId,
    tripId: loss.command!.tripId,
    intent: 'reset',
    writes: managementUI(world).writes.length,
  });
}
