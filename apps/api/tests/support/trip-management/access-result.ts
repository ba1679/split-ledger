import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { AccessContext } from './access-fixture.js';
import type { AccessRequest } from './access-request.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';
import { expectedCurrentState } from './rejections.js';

export async function assertPrivateAccess(world: LedgerWorld): Promise<void> {
  const context = world.get<AccessContext>('management:access');
  const request = world.get<AccessRequest>('management:accessRequest');
  const before = world.get<TripManagementSnapshot>('management:before');
  const shared = world.get('management:sharedBefore');
  const actorHeaders: Record<string, string> = { cookie: context.cookie ?? '' };
  const response = world.response!;

  expect(response.headers()['content-type']).toContain('application/json');
  const body = await response.json();

  if (context.actor !== '訪客' && request.access === '垃圾桶清單') {
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.nextCursor === null || typeof body.nextCursor === 'string').toBe(true);
    const items: Record<string, unknown>[] = [...body.items];
    const cursors = new Set<string>();
    let cursor = body.nextCursor as string | null;

    while (cursor !== null) {
      expect(typeof cursor).toBe('string');
      expect(cursors.has(cursor)).toBe(false);
      cursors.add(cursor);
      const next = await world.api.get(
        `/api/trips/trash?${new URLSearchParams({ cursor, limit: '1' })}`,
        { headers: actorHeaders },
      );

      expect(next.status()).toBe(200);
      const page = await next.json();

      expect(Array.isArray(page.items)).toBe(true);
      expect(page.nextCursor === null || typeof page.nextCursor === 'string').toBe(true);
      items.push(...page.items);
      cursor = page.nextCursor;
    }
    const actorId = world.users.get(context.actor)!.id;
    const rows = (
      await world.db.query(
        'SELECT t.*,EXISTS(SELECT 1 FROM trip_thumbnails i WHERE i.owner_id=t.owner_id AND i.trip_id=t.id) AS has_thumbnail FROM trips t WHERE owner_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC,id DESC',
        [actorId],
      )
    ).rows;

    expect(items).toEqual(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        deletedAt: (row.deleted_at as Date).toISOString(),
        lifecycleRevision: String(row.lifecycle_revision),
        thumbnailRevision: String(row.thumbnail_revision),
        hasThumbnail: row.has_thumbnail,
      })),
    );
    expect(new Set(items.map((row) => row.id)).size).toBe(items.length);
    expect(items.some((row) => row.id === context.tripId)).toBe(false);
  } else {
    expect(response.status()).toBe(context.actor === '訪客' ? 401 : 404);
    expect(body).toMatchObject({
      code: context.actor === '訪客' ? 'UNAUTHENTICATED' : 'NOT_FOUND',
      message: expect.any(String),
    });
    expect(Object.keys(body).sort()).toEqual(['code', 'message']);
    const serialized = JSON.stringify(body);

    for (const forbidden of [
      context.tripId,
      world.users.get('Alice')!.id,
      context.operationId,
      '日本旅行',
      'Alice',
    ])
      expect(serialized).not.toContain(forbidden);
    // Controls are read-only. For denied mutations use unknown owner-state lookup, not a second Act.
    const unknownPath =
      request.method === 'GET' && request.access !== '垃圾桶清單'
        ? request.path
            .replace(context.tripId, context.unknownTripId)
            .replace(context.operationId, context.unknownOperationId)
        : `/api/trips/${context.unknownTripId}/state`;
    const unknown = await world.api.get(unknownPath, { headers: actorHeaders });

    expect(unknown.status()).toBe(response.status());
    expect(
      await unknown.json(),
      'Known foreign IDs must not disclose existence relative to an unknown ID',
    ).toEqual(body);
    expect(await response.body()).not.toEqual(before.thumbnails[0]!.image_webp);
  }
  expect(await managementSnapshot(world)).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(shared);
  const state = await ownerRead(world, `/api/trips/${context.tripId}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(before));
  const imagePath =
    context.state === 'trash'
      ? `/api/trips/trash/${context.tripId}/thumbnail/${context.thumbnailRevision}`
      : `/api/trips/${context.tripId}/thumbnail/${context.thumbnailRevision}`;
  const ownerImage = await ownerRead(world, imagePath);

  expect(ownerImage.status()).toBe(200);
  expect(ownerImage.headers()['content-type']).toContain('image/webp');
  expect(await ownerImage.body()).toEqual(before.thumbnails[0]!.image_webp);
  expect(
    await managementSnapshot(world),
    'No new receipt or data changes after all read-only verification',
  ).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(shared);
}
