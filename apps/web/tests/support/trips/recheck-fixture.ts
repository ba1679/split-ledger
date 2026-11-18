import { randomUUID } from 'node:crypto';
import { seaImage } from '../../../../api/tests/support/trip-management/generated-images.js';
import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../api/tests/support/trip-management/rejections.js';
import { arrangeManagementPage, managementUI } from './management-fixture.js';
import { arrangeThumbnailDraft } from '../thumbnail/draft-fixture.js';
import { arrangeNewTripDraft } from './new-trip-fixture.js';
import { submitNewTrip } from './new-trip-flow.js';
import { arrangeCommittedResponseLoss } from './committed-response-loss.js';
import { assertUnknownOutcome } from './unknown-result.js';

export async function arrangeRecheck(
  page: Page,
  world: LedgerWorld,
  variant: string,
): Promise<void> {
  expect(['移入後已復原', '圖片後已換海邊', '永久刪除', '保存預設圖', '新增附圖']).toContain(
    variant,
  );
  const isNew = variant === '新增附圖';
  const operation =
    variant === '移入後已復原'
      ? '移至垃圾桶'
      : variant === '永久刪除'
        ? '永久刪除'
        : isNew
          ? '新增附圖'
          : '保存圖片';
  await arrangeManagementPage(
    page,
    world,
    isNew
      ? '新增表單'
      : variant === '移入後已復原'
        ? '移入確認'
        : variant === '永久刪除'
          ? '永久刪除確認'
          : '縮圖編輯',
  );
  if (isNew) await arrangeNewTripDraft(world, '合法神社');
  else if (operation === '保存圖片')
    await arrangeThumbnailDraft(world, variant === '保存預設圖' ? '預設圖' : '神社照片');
  const loss = await arrangeCommittedResponseLoss(world, operation);
  if (isNew) await submitNewTrip(world);
  else await page.getByRole('dialog').getByRole('button', { name: operation, exact: true }).click();
  await assertUnknownOutcome(world);
  const { tripId, operationId } = loss.command!;
  const original = loss.after!;
  const row = original.trips[0];
  const headers = {
    cookie: world.users.get('Alice')!.cookie,
    origin: world.get<string>('webOrigin'),
  };
  // An independent authenticated API client represents the owner's other device.
  if (variant === '移入後已復原') {
    const response = await world.api.post(`/api/trips/${tripId}/restore`, {
      headers,
      data: {
        operationId: randomUUID(),
        expectedLifecycleRevision: String(row!.lifecycle_revision),
      },
    });
    expect(response.status()).toBe(200);
    expect((await managementSnapshot(world, tripId)).trips[0]!.deleted_at).toBeNull();
  } else if (variant === '圖片後已換海邊') {
    const bytes = await seaImage();
    const response = await world.api.post(`/api/trips/${tripId}/thumbnail`, {
      headers: {
        ...headers,
        'X-Operation-Id': randomUUID(),
        'X-Expected-Lifecycle-Revision': String(row!.lifecycle_revision),
        'X-Expected-Thumbnail-Revision': String(row!.thumbnail_revision),
      },
      multipart: { image: { name: '海邊.png', mimeType: 'image/png', buffer: bytes } },
    });
    expect(response.status()).toBe(200);
    const current = await managementSnapshot(world, tripId);
    expect(String(current.trips[0]!.thumbnail_revision)).toBe(
      String(BigInt(String(row!.thumbnail_revision)) + 1n),
    );
    expect(current.thumbnails[0]!.image_webp).not.toEqual(original.thumbnails[0]!.image_webp);
    world.set('management:recheckSeaBytes', current.thumbnails[0]!.image_webp);
  }
  const current = await managementSnapshot(world, tripId);
  expect(current.receipts.find((receipt) => receipt.operation_id === operationId)).toEqual(
    original.receipts.find((receipt) => receipt.operation_id === operationId),
  );
  const receipt = await ownerRead(world, `/api/trips/${tripId}/operations/${operationId}`);
  expect(receipt.status()).toBe(200);
  expect(await receipt.json()).toEqual({
    result: loss.outcome!.result,
    currentState: expectedCurrentState(current),
  });
  expect(managementUI(world).writes.length).toBe(isNew ? 2 : 1);
  world.set('management:recheck', {
    variant,
    current,
    writes: managementUI(world).writes.length,
    verificationStart: loss.verifications.length,
  });
  loss.unblock();
}
