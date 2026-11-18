import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';

export const lifecycleCommands = {
  移至垃圾桶: { path: 'trash', kind: 'move_to_trash' },
  復原: { path: 'restore', kind: 'restore' },
  永久刪除: { path: 'purge', kind: 'purge' },
} as const;

export interface RecordedTripCommand {
  tripId: string;
  operationId: string;
  kind: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  data?: Record<string, unknown>;
  image?: Buffer;
}

export interface TripCommandOverrides {
  operationId?: string;
  expectedLifecycleRevision?: string;
  expectedThumbnailRevision?: string;
  image?: Buffer;
}

export async function executeOwnerTripCommand(
  world: LedgerWorld,
  operation: string,
  sessionCookie?: string,
): Promise<void> {
  const tripId = managementTripId(world);
  const before = await managementSnapshot(world);
  const versions = world.tripManagement.versions.get(tripId);

  expect(versions).toBeDefined();
  const overrides = world.state.has('management:commandOverrides')
    ? world.get<TripCommandOverrides>('management:commandOverrides')
    : {};
  world.state.delete('management:commandOverrides');
  const lifecycleRevision =
    overrides.expectedLifecycleRevision ??
    String(before.trips[0]?.lifecycle_revision ?? versions!.lifecycle);
  const thumbnailRevision =
    overrides.expectedThumbnailRevision ??
    String(before.trips[0]?.thumbnail_revision ?? versions!.thumbnail);
  const operationId = overrides.operationId ?? randomUUID();
  const headers = {
    cookie: sessionCookie ?? world.users.get('Alice')!.cookie,
    origin: world.get<string>('webOrigin'),
  };
  const command: RecordedTripCommand = {
    tripId,
    operationId,
    kind: '',
    method: 'POST',
    path: '',
    headers,
  };

  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  if (operation in lifecycleCommands) {
    const entry = lifecycleCommands[operation as keyof typeof lifecycleCommands];

    command.kind = entry.kind;
    command.path = `/api/trips/${tripId}/${entry.path}`;
    command.data = { operationId, expectedLifecycleRevision: lifecycleRevision };
  } else if (operation === '保存預設圖' || operation === '保存神社') {
    command.kind = operation === '保存神社' ? 'save_thumbnail' : 'reset_thumbnail';
    command.path = `/api/trips/${tripId}/thumbnail`;
    command.method = operation === '保存神社' ? 'POST' : 'DELETE';
    command.headers = {
      ...headers,
      'X-Operation-Id': operationId,
      'X-Expected-Lifecycle-Revision': lifecycleRevision,
      'X-Expected-Thumbnail-Revision': thumbnailRevision,
    };
    if (operation === '保存神社')
      command.image =
        overrides.image ??
        (await sharp({
          create: { width: 64, height: 48, channels: 3, background: '#ad4038' },
        })
          .png()
          .toBuffer());
  } else {
    expect(operation).toBe('新建原旅行');
    command.kind = 'create';
    command.path = '/api/trips';
    command.data = { id: tripId, name: '日本旅行', startDate: '2027-03-10', endDate: '2027-03-15' };
  }
  world.set('management:lastCommand', command);
  world.tripManagement.ids.operations.set('本次操作', operationId);
  world.response = await world.api.fetch(command.path, {
    method: command.method,
    headers: command.headers,
    ...(command.data ? { data: command.data } : {}),
    ...(command.image
      ? { multipart: { image: { name: '神社.png', mimeType: 'image/png', buffer: command.image } } }
      : {}),
  });
}
