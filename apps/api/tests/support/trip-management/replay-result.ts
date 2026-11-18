import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { RecordedTripCommand } from './commands.js';
import { assertOriginalAndCurrent } from './receipt-result.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';

export async function assertReplayPreservesIntent(world: LedgerWorld): Promise<void> {
  const original = world.get<RecordedTripCommand>('management:originalCommand');
  const receipt = world.get<Record<string, unknown>>('management:originalReceipt');
  const before = world.get<TripManagementSnapshot>('management:before');

  expect(world.get('management:replayedOperationId')).toBe(original.operationId);
  await assertOriginalAndCurrent(world);
  const row = before.trips[0];
  const currentRevision = row ? String(row.thumbnail_revision) : null;
  const currentPath =
    row?.deleted_at !== null
      ? `/api/trips/trash/${original.tripId}/thumbnail/${currentRevision}`
      : `/api/trips/${original.tripId}/thumbnail/${currentRevision}`;

  if (before.thumbnails.length === 1) {
    const image = await ownerRead(world, currentPath);

    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/webp');
    expect(image.headers()['cache-control']).toBe('private, no-store');
    expect(image.headers()['x-content-type-options']).toBe('nosniff');
    expect(
      await image.body(),
      'Serve the latest beach/mountain bytes, never the replayed original',
    ).toEqual(before.thumbnails[0]!.image_webp);
  }
  const staleRevisions = new Set(
    [
      String(receipt.result_thumbnail_revision),
      original.headers['X-Expected-Thumbnail-Revision'],
    ].filter((value): value is string => value !== undefined),
  );

  for (const revision of staleRevisions) {
    if (revision === currentRevision && before.thumbnails.length === 1) continue;
    const suffix = `/thumbnail/${revision}`;
    const prefix =
      row?.deleted_at !== null
        ? `/api/trips/trash/${original.tripId}`
        : `/api/trips/${original.tripId}`;
    const missing = await ownerRead(world, `${prefix}${suffix}`);

    expect(missing.status()).toBe(404);
    expect(await missing.json()).toMatchObject({ code: 'NOT_FOUND' });
    if (!row) {
      const ordinary = await ownerRead(world, `/api/trips/${original.tripId}${suffix}`);

      expect(ordinary.status()).toBe(404);
      expect(await ordinary.json()).toMatchObject({ code: 'NOT_FOUND' });
    }
  }
  expect(
    await managementSnapshot(world),
    'Replay plus verification cannot add receipts, versions or resurrect a purged trip',
  ).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
}
