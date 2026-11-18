import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import {
  seedLifecycleBaseline,
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from './baseline.js';
import { executeOwnerTripCommand, type RecordedTripCommand } from './commands.js';

export function receiptResult(receipt: Record<string, unknown>) {
  return {
    operationId: receipt.operation_id,
    kind: receipt.kind,
    state: receipt.result_state,
    lifecycleRevision: String(receipt.result_lifecycle_revision),
    thumbnailRevision: String(receipt.result_thumbnail_revision),
    thumbnailPresent: receipt.result_thumbnail_present,
  };
}

export async function arrangeCommittedOriginal(
  world: LedgerWorld,
  operation: string,
  current: string,
): Promise<void> {
  const combinations: Record<string, readonly string[]> = {
    移至垃圾桶: ['垃圾桶', '一般可用'],
    永久刪除: ['已永久刪除'],
    保存神社: ['海邊縮圖'],
    保存預設圖: ['預設圖'],
  };

  expect(Object.keys(combinations)).toContain(operation);
  expect(combinations[operation]).toContain(current);
  await seedLifecycleBaseline(world, operation === '永久刪除' ? '垃圾桶' : '一般可用');
  await executeOwnerTripCommand(world, operation);
  expect(world.response!.status(), 'Original Given must be an actually committed command').toBe(
    200,
  );
  const originalCommand = world.get<RecordedTripCommand>('management:lastCommand');
  const originalSnapshot = await managementSnapshot(world);
  const receipts = originalSnapshot.receipts.filter(
    (row) => row.operation_id === originalCommand.operationId,
  );

  expect(receipts).toHaveLength(1);
  const originalReceipt = receipts[0]!;

  expect((await world.response!.json()).result).toEqual(receiptResult(originalReceipt));
  world.set('management:originalCommand', originalCommand);
  world.set('management:originalReceipt', originalReceipt);
  world.set('management:originalCommitted', originalSnapshot);
  if (operation === '移至垃圾桶' && current === '一般可用') {
    await executeOwnerTripCommand(world, '復原');
    expect(world.response!.status()).toBe(200);
  } else if (current === '海邊縮圖') {
    const tripId = managementTripId(world);
    const row = originalSnapshot.trips[0]!;
    const beach = await sharp({
      create: { width: 64, height: 48, channels: 3, background: { r: 12, g: 80, b: 150 } },
    })
      .png()
      .toBuffer();
    const response = await world.api.post(`/api/trips/${tripId}/thumbnail`, {
      headers: {
        cookie: world.users.get('Alice')!.cookie,
        origin: world.get('webOrigin'),
        'X-Operation-Id': randomUUID(),
        'X-Expected-Lifecycle-Revision': String(row.lifecycle_revision),
        'X-Expected-Thumbnail-Revision': String(row.thumbnail_revision),
      },
      multipart: { image: { name: '海邊.png', mimeType: 'image/png', buffer: beach } },
    });

    expect(response.status()).toBe(200);
    const after = await managementSnapshot(world);
    const bytes = after.thumbnails[0]!.image_webp as Buffer;
    const pixel = await sharp(bytes).removeAlpha().raw().toBuffer();

    expect(bytes).not.toEqual(originalSnapshot.thumbnails[0]!.image_webp);
    for (const [index, expected] of [12, 80, 150].entries())
      expect(Math.abs(pixel[index]! - expected)).toBeLessThanOrEqual(10);
    expect(String(after.trips[0]!.thumbnail_revision)).toBe(
      String(BigInt(String(row.thumbnail_revision)) + 1n),
    );
  }
  const now = await managementSnapshot(world);

  expect(now.receipts.find((row) => row.operation_id === originalCommand.operationId)).toEqual(
    originalReceipt,
  );
  if (current === '已永久刪除') {
    expect(now.trips).toEqual([]);
    expect(now.thumbnails).toEqual([]);
    expect(now.reservations[0]!.purged_at).not.toBeNull();
  } else {
    expect(now.trips[0]!.deleted_at !== null).toBe(current === '垃圾桶');
    expect(now.thumbnails.length).toBe(current === '預設圖' ? 0 : 1);
  }
  world.set('management:currentIntent', current);
  world.set('management:before', now);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  // The harness retains authoritative evidence; the scenario has no acknowledged original response.
  world.response = undefined;
}
