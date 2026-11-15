import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { arrangeManagementPage, managementUI } from './management-fixture.js';
import { arrangeCommittedResponseLoss } from './committed-response-loss.js';
import { arrangeThumbnailDraft } from '../thumbnail/draft-fixture.js';
import { arrangeNewTripDraft } from './new-trip-fixture.js';
import { submitNewTrip } from './new-trip-flow.js';

export async function arrangePendingVerification(
  page: Page,
  world: LedgerWorld,
  operation: string,
): Promise<void> {
  expect(['移入', 'purge', '神社保存', '預設保存', '新增附圖']).toContain(operation);
  const isNew = operation === '新增附圖';
  const command =
    operation === '移入'
      ? '移至垃圾桶'
      : operation === 'purge'
        ? '永久刪除'
        : isNew
          ? '新增附圖'
          : '保存圖片';
  await arrangeManagementPage(
    page,
    world,
    operation === '移入'
      ? '移入確認'
      : operation === 'purge'
        ? '永久刪除確認'
        : isNew
          ? '新增表單'
          : '縮圖編輯',
  );
  if (isNew) await arrangeNewTripDraft(world, '合法神社');
  else if (command === '保存圖片')
    await arrangeThumbnailDraft(world, operation === '預設保存' ? '預設圖' : '神社照片');
  const loss = await arrangeCommittedResponseLoss(world, command, {
    holdVerificationFailures: true,
  });
  if (isNew) await submitNewTrip(world);
  else await page.getByRole('dialog').getByRole('button', { name: command, exact: true }).click();
  await loss.finished;
  expect(loss.failure).toBeUndefined();
  expect(loss.outcome).toBeDefined();
  expect(loss.blocked).toBe(true);
  await expect.poll(() => loss.pendingVerificationFailures, { timeout: 15000 }).toBeGreaterThan(0);
  expect(managementUI(world).writes.length).toBe(isNew ? 2 : 1);
  world.set('management:pendingVerificationOperation', operation);
}
