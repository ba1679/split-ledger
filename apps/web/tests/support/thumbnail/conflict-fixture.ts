import { randomUUID } from 'node:crypto';
import { expect, type Browser, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { expectedCurrentState } from '../../../../api/tests/support/trip-management/rejections.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { seaImage } from '../../../../api/tests/support/trip-management/generated-images.js';
import { arrangeManagementPage, managementUI } from '../trips/management-fixture.js';
import { arrangeThumbnailDraft } from './draft-fixture.js';

export interface ThumbnailConflict {
  conflict: string;
  current: TripManagementSnapshot;
  readsStart: number;
  otherOperations: string[];
}

export async function arrangeThumbnailConflict(
  page: Page,
  browser: Browser,
  world: LedgerWorld,
  conflict: string,
): Promise<void> {
  expect(['圖片版本', '旅行版本']).toContain(conflict);
  await arrangeManagementPage(page, world, '縮圖編輯');
  await arrangeThumbnailDraft(world, '神社照片');
  const tripId = managementTripId(world),
    before = world.get<TripManagementSnapshot>('management:before'),
    row = before.trips[0]!;
  const other = await browser.newContext({ baseURL: world.get<string>('webOrigin') });
  const operations: string[] = [];
  try {
    await other.addCookies(await page.context().cookies());
    const headers = { origin: world.get<string>('webOrigin') };
    if (conflict === '圖片版本') {
      const operationId = randomUUID();
      operations.push(operationId);
      const response = await other.request.post(`/api/trips/${tripId}/thumbnail`, {
        headers: {
          ...headers,
          'X-Operation-Id': operationId,
          'X-Expected-Lifecycle-Revision': String(row.lifecycle_revision),
          'X-Expected-Thumbnail-Revision': String(row.thumbnail_revision),
        },
        multipart: { image: { name: '海邊.png', mimeType: 'image/png', buffer: await seaImage() } },
      });
      expect(response.status()).toBe(200);
      expect((await response.json()).result).toMatchObject({
        operationId,
        kind: 'save_thumbnail',
        thumbnailPresent: true,
      });
    } else {
      let lifecycle = String(row.lifecycle_revision);
      for (const action of ['trash', 'restore']) {
        const operationId = randomUUID();
        operations.push(operationId);
        const response = await other.request.post(`/api/trips/${tripId}/${action}`, {
          headers,
          data: { operationId, expectedLifecycleRevision: lifecycle },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.result).toMatchObject({
          operationId,
          state: action === 'trash' ? 'trash' : 'active',
        });
        lifecycle = body.currentState.lifecycleRevision;
      }
    }
    const current = await managementSnapshot(world);
    expect(current.trips[0]!.deleted_at).toBeNull();
    expect(String(current.trips[0]!.lifecycle_revision)).toBe(
      String(BigInt(String(row.lifecycle_revision)) + (conflict === '旅行版本' ? 2n : 0n)),
    );
    expect(String(current.trips[0]!.thumbnail_revision)).toBe(
      String(BigInt(String(row.thumbnail_revision)) + (conflict === '圖片版本' ? 1n : 0n)),
    );
    if (conflict === '圖片版本')
      expect(current.thumbnails[0]!.image_webp).not.toEqual(before.thumbnails[0]!.image_webp);
    else expect(current.thumbnails).toEqual(before.thumbnails);
    for (const key of [
      'members',
      'expenses',
      'shares',
      'repayments',
      'settlements',
      'adjustments',
      'reservations',
      'categories',
    ] as const)
      expect(current[key]).toEqual(before[key]);
    for (const operationId of operations) {
      const receipt = await other.request.get(`/api/trips/${tripId}/operations/${operationId}`);
      expect(receipt.status()).toBe(200);
      expect((await receipt.json()).currentState).toEqual(expectedCurrentState(current));
    }
    const ui = managementUI(world);
    expect(ui.writes.length).toBe(0);
    world.set('management:thumbnailConflict', {
      conflict,
      current,
      readsStart: ui.reads.length,
      otherOperations: operations,
    } satisfies ThumbnailConflict);
    await assertOtherDataUnchanged(world);
  } finally {
    await other.close();
  }
}
