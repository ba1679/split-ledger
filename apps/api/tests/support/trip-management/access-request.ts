import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import type { AccessContext } from './access-fixture.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';

export interface AccessRequest {
  access: string;
  method: string;
  path: string;
}

export async function requestAsAccessor(world: LedgerWorld, access: string): Promise<void> {
  const context = world.get<AccessContext>('management:access');
  const trip = `/api/trips/${context.tripId}`;
  const headers: Record<string, string> = {
    origin: world.get('webOrigin'),
    cookie: context.cookie ?? '',
  };
  const getPaths: Record<string, string> = {
    狀態: `${trip}/state`,
    垃圾桶清單: '/api/trips/trash',
    帳本: trip,
    圖片:
      context.state === 'trash'
        ? `/api/trips/trash/${context.tripId}/thumbnail/${context.thumbnailRevision}`
        : `${trip}/thumbnail/${context.thumbnailRevision}`,
    操作收據: `${trip}/operations/${context.operationId}`,
  };
  const lifecycle: Record<string, string> = {
    移至垃圾桶: 'trash',
    復原: 'restore',
    永久刪除: 'purge',
  };
  const operationId = randomUUID();
  let request: AccessRequest;
  let data: Record<string, unknown> | undefined;
  let image: Buffer | undefined;

  if (access in getPaths) request = { access, method: 'GET', path: getPaths[access]! };
  else if (access in lifecycle) {
    request = { access, method: 'POST', path: `${trip}/${lifecycle[access]!}` };
    data = { operationId, expectedLifecycleRevision: context.lifecycleRevision };
  } else {
    expect(['保存縮圖', '保存預設圖']).toContain(access);
    request = {
      access,
      method: access === '保存縮圖' ? 'POST' : 'DELETE',
      path: `${trip}/thumbnail`,
    };
    headers['X-Operation-Id'] = operationId;
    headers['X-Expected-Lifecycle-Revision'] = context.lifecycleRevision;
    headers['X-Expected-Thumbnail-Revision'] = context.thumbnailRevision;
    if (access === '保存縮圖')
      image = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#7aac9c' } })
        .png()
        .toBuffer();
  }
  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.set('management:accessRequest', request);
  world.response = await world.api.fetch(request.path, {
    method: request.method,
    headers,
    ...(data ? { data } : {}),
    ...(image
      ? { multipart: { image: { name: 'image.png', mimeType: 'image/png', buffer: image } } }
      : {}),
  });
}
