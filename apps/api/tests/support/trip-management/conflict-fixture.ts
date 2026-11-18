import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import { seedSession } from '../seed.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import {
  executeOwnerTripCommand,
  type RecordedTripCommand,
  type TripCommandOverrides,
} from './commands.js';

export async function arrangeStaleCommand(world: LedgerWorld, conflict: string): Promise<void> {
  expect(['舊生命週期版本', '舊縮圖版本', '同操作識別不同內容']).toContain(conflict);
  const before = await managementSnapshot(world);
  const alternate = await seedSession(world, 'Alice');

  expect(alternate.cookie).not.toBe(world.users.get('Alice')!.cookie);
  const overrides: TripCommandOverrides = {};
  if (conflict === '舊生命週期版本') {
    for (const operation of ['移至垃圾桶', '復原']) {
      await executeOwnerTripCommand(world, operation, alternate.cookie);
      expect(world.response!.status()).toBe(200);
    }
    overrides.expectedLifecycleRevision = String(before.trips[0]!.lifecycle_revision);
  } else {
    await executeOwnerTripCommand(world, '保存神社', alternate.cookie);
    expect(world.response!.status()).toBe(200);
    if (conflict === '舊縮圖版本')
      overrides.expectedThumbnailRevision = String(before.trips[0]!.thumbnail_revision);
    else {
      const original = world.get<RecordedTripCommand>('management:lastCommand');

      overrides.operationId = original.operationId;
      overrides.expectedLifecycleRevision = original.headers['X-Expected-Lifecycle-Revision'];
      overrides.expectedThumbnailRevision = original.headers['X-Expected-Thumbnail-Revision'];
      overrides.image = await sharp({
        create: { width: 64, height: 48, channels: 3, background: '#318fbd' },
      })
        .png()
        .toBuffer();
      expect(overrides.image).not.toEqual(original.image);
      const current = await managementSnapshot(world);

      expect(
        current.receipts.filter((row) => row.operation_id === original.operationId),
      ).toHaveLength(1);
    }
  }
  const current = await managementSnapshot(world);

  expect(current.trips[0]!.deleted_at).toBeNull();
  if (conflict === '舊生命週期版本')
    expect(BigInt(String(current.trips[0]!.lifecycle_revision))).toBe(
      BigInt(String(before.trips[0]!.lifecycle_revision)) + 2n,
    );
  else
    expect(BigInt(String(current.trips[0]!.thumbnail_revision))).toBe(
      BigInt(String(before.trips[0]!.thumbnail_revision)) + 1n,
    );
  world.set('management:commandOverrides', overrides);
  world.set('management:before', current);
  world.set('management:sharedBefore', await sharedSnapshot(world));
}
