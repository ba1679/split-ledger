import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { UploadImage } from './generated-images.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';

export interface ThumbnailRequest {
  tripId: string;
  operationId: string;
  lifecycleRevision: string;
  thumbnailRevision: string;
  hashes: string[];
}

export function imageMultipart(files: readonly UploadImage[], boundary: string): Buffer {
  const parts: Buffer[] = [];
  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${file.name}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`,
      ),
      file.bytes,
      Buffer.from('\r\n'),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return Buffer.concat(parts);
}

export async function saveSelectedThumbnail(world: LedgerWorld): Promise<void> {
  const files = world.get<UploadImage[]>('management:uploadFiles');

  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    expect(await readFile(file.asset.path)).toEqual(file.bytes);
    expect(createHash('sha256').update(file.bytes).digest('hex')).toBe(file.asset.sha256);
  }
  const before = await managementSnapshot(world);
  const tripId = managementTripId(world);
  const operationId = randomUUID();
  const row = before.trips[0]!;
  const boundary = `ledger-${randomUUID()}`;
  const request: ThumbnailRequest = {
    tripId,
    operationId,
    lifecycleRevision: String(row.lifecycle_revision),
    thumbnailRevision: String(row.thumbnail_revision),
    hashes: files.map((file) => file.asset.sha256),
  };

  world.set('management:thumbnailRequest', request);
  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.response = await world.api.post(`/api/trips/${tripId}/thumbnail`, {
    headers: {
      cookie: world.users.get('Alice')!.cookie,
      origin: world.get('webOrigin'),
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'X-Operation-Id': operationId,
      'X-Expected-Lifecycle-Revision': request.lifecycleRevision,
      'X-Expected-Thumbnail-Revision': request.thumbnailRevision,
    },
    data: imageMultipart(files, boundary),
  });
}
