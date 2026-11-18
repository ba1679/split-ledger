import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { RecordedTripCommand } from '../../../../api/tests/support/trip-management/commands.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import type { ThumbnailRequest } from '../../../../api/tests/support/trip-management/thumbnail-request.js';
import { managementTripId } from '../../../../api/tests/support/trip-management/baseline.js';
import type { ThumbnailDraft } from './draft-fixture.js';
import { managementUI } from '../trips/management-fixture.js';

export async function observedThumbnailCommand(world: LedgerWorld, selected: string) {
  const ui = managementUI(world);
  const start = world.state.has('management:writeStart')
    ? world.get<number>('management:writeStart')
    : 0;
  const draft = world.get<ThumbnailDraft>('management:draft');
  const tripId = managementTripId(world);
  const before = world.get<TripManagementSnapshot>('management:before');

  expect(draft.name).toBe(selected);
  expect(['save', 'reset']).toContain(draft.intent);
  await expect.poll(() => ui.writes.length - start).toBe(1);
  const request = ui.writes[start]!;
  const headers = await request.allHeaders();
  const operationId = headers['x-operation-id'];

  expect(request.method()).toBe(draft.intent === 'save' ? 'POST' : 'DELETE');
  expect(new URL(request.url()).pathname).toBe(`/api/trips/${tripId}/thumbnail`);
  expect(headers.origin).toBe(world.get('webOrigin'));
  expect(operationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  expect(headers['x-expected-lifecycle-revision']).toBe(
    String(before.trips[0]!.lifecycle_revision),
  );
  expect(headers['x-expected-thumbnail-revision']).toBe(
    String(before.trips[0]!.thumbnail_revision),
  );
  if (draft.intent === 'save') {
    expect(headers['content-type']).toMatch(/^multipart\/form-data;\s*boundary=/);
    expect(draft.file).toBeDefined();
    world.set('management:thumbnailRequest', {
      tripId,
      operationId: operationId!,
      lifecycleRevision: headers['x-expected-lifecycle-revision']!,
      thumbnailRevision: headers['x-expected-thumbnail-revision']!,
      hashes: [draft.file!.asset.sha256],
    } satisfies ThumbnailRequest);
  } else expect(request.postDataBuffer()?.length ?? 0).toBe(0);
  if (world.state.has('management:failedThumbnailOperationId'))
    expect(operationId).not.toBe(world.get('management:failedThumbnailOperationId'));
  const response = await request.response();

  expect(response).not.toBeNull();
  expect(await response!.finished()).toBeNull();
  const command: RecordedTripCommand = {
    tripId,
    operationId: operationId!,
    kind: draft.intent === 'save' ? 'save_thumbnail' : 'reset_thumbnail',
    method: request.method(),
    path: new URL(request.url()).pathname,
    headers: { origin: headers.origin! },
  };

  world.set('management:lastCommand', command);

  return { response: response!, command, start };
}
