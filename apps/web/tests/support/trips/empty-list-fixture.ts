import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { requireProductColumns } from '../../../../api/tests/support/splitting/schema.js';
import { seedTrip, seedIdentity, callApi } from '../../../../api/tests/support/seed.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerTripPages } from '../../../../api/tests/support/trip-management/lifecycle-result.js';
import { login } from '../browser.js';
import { observeManagement } from './management-fixture.js';

export async function arrangeEmptyList(
  page: Page,
  world: LedgerWorld,
  scope: string,
): Promise<void> {
  expect(['一般清單', '垃圾桶']).toContain(scope);
  await requireProductColumns(world, 'trips', [
    'deleted_at',
    'lifecycle_revision',
    'thumbnail_revision',
  ]);
  await seedIdentity(world, 'Alice');
  const trip = await seedTrip(world, '日本旅行', 'Alice');

  world.tripManagement.ids.trips.set('日本旅行', trip.id);
  const operations = scope === '一般清單' ? ['trash'] : ['trash', 'restore'];
  for (const operation of operations) {
    const row = (
      await world.db.query('SELECT lifecycle_revision FROM trips WHERE id=$1', [trip.id])
    ).rows[0]!;
    const response = await callApi(
      world,
      'POST',
      `/api/trips/${trip.id}/${operation}`,
      { operationId: randomUUID(), expectedLifecycleRevision: String(row.lifecycle_revision) },
      'Alice',
    );
    expect(response.status(), 'Empty Given requires genuinely committed lifecycle history').toBe(
      200,
    );
    expect((await response.json()).result.state).toBe(operation === 'trash' ? 'trash' : 'active');
  }
  const selected = scope === '一般清單' ? 'active' : 'trash';
  const opposite = selected === 'active' ? 'trash' : 'active';

  expect(await ownerTripPages(world, selected)).toEqual([]);
  expect((await ownerTripPages(world, opposite)).map((row) => row.id)).toEqual([trip.id]);
  const before = await managementSnapshot(world);

  expect(before.trips).toHaveLength(1);
  expect(before.receipts).toHaveLength(operations.length);
  expect(page.url(), 'No browser account query cache may predate this Act').toBe('about:blank');
  await login(page, world, 'Alice');
  world.set('management:before', before);
  world.set('management:emptyList', scope);
  observeManagement(page, world, scope);
}
