import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { RecordedTripCommand } from '../../../../api/tests/support/trip-management/commands.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementTripId } from '../../../../api/tests/support/trip-management/baseline.js';
import { managementUI } from './management-fixture.js';

export async function observedLifecycleCommand(
  world: LedgerWorld,
  operation: 'trash' | 'restore' | 'purge',
) {
  const ui = managementUI(world);
  const tripId = managementTripId(world);
  const path = `/api/trips/${tripId}/${operation}`;

  await expect.poll(() => ui.writes.length).toBe(1);
  const request = ui.writes[0]!;

  expect(request.method()).toBe('POST');
  expect(new URL(request.url()).pathname).toBe(path);
  const data = request.postDataJSON() as Record<string, unknown>;
  const before = world.get<TripManagementSnapshot>('management:before');

  expect(Object.keys(data).sort()).toEqual(['expectedLifecycleRevision', 'operationId']);
  expect(data.operationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  expect(data.expectedLifecycleRevision).toBe(String(before.trips[0]!.lifecycle_revision));
  // The synchronous projection can omit browser-managed security headers.
  // Read the complete native request; keep the exact trusted-Origin assertion.
  const headers = await request.allHeaders();

  expect(headers.origin).toBe(world.get('webOrigin'));
  const response = await request.response();

  expect(response).not.toBeNull();
  expect(await response!.finished()).toBeNull();
  const command: RecordedTripCommand = {
    tripId,
    operationId: data.operationId as string,
    kind: operation === 'trash' ? 'move_to_trash' : operation,
    method: request.method(),
    path,
    data,
    headers: { origin: headers.origin! },
  };

  world.set('management:lastCommand', command);

  return { response: response!, command };
}
