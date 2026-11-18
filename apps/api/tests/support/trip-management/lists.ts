import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import { ownerTripPages } from './lifecycle-result.js';

export async function expectedOwnerList(world: LedgerWorld, scope: 'active' | 'trash') {
  const ownerId = world.users.get('Alice')!.id;
  const rows = (
    await world.db.query(
      `SELECT t.*,t.start_date::text AS fixture_start_date,t.end_date::text AS fixture_end_date,
       (SELECT count(*)::int FROM expenses e WHERE e.trip_id=t.id AND e.owner_id=t.owner_id) AS fixture_expense_count,
       (SELECT id FROM trip_members m WHERE m.trip_id=t.id AND m.owner_id=t.owner_id AND m.role='owner') AS fixture_owner_member,
       EXISTS(SELECT 1 FROM trip_thumbnails i WHERE i.trip_id=t.id AND i.owner_id=t.owner_id) AS fixture_thumbnail
     FROM trips t WHERE owner_id=$1 AND deleted_at IS ${scope === 'active' ? '' : 'NOT '}NULL
     ORDER BY ${scope === 'active' ? 'created_at' : 'deleted_at'} DESC,id DESC`,
      [ownerId],
    )
  ).rows;

  return rows.map((row) =>
    scope === 'trash'
      ? {
          id: row.id,
          name: row.name,
          deletedAt: (row.deleted_at as Date).toISOString(),
          lifecycleRevision: String(row.lifecycle_revision),
          thumbnailRevision: String(row.thumbnail_revision),
          hasThumbnail: row.fixture_thumbnail,
        }
      : {
          id: row.id,
          name: row.name,
          startDate: row.fixture_start_date,
          endDate: row.fixture_end_date,
          expenseCount: row.fixture_expense_count,
          ownerMemberId: row.fixture_owner_member,
          simplifyDebts: row.simplify_debts,
          accountingRevision: String(row.accounting_revision),
          lifecycleRevision: String(row.lifecycle_revision),
          thumbnailRevision: String(row.thumbnail_revision),
          hasThumbnail: row.fixture_thumbnail,
          createdAt: (row.created_at as Date).toISOString(),
          updatedAt: (row.updated_at as Date).toISOString(),
        },
  );
}

export async function assertOwnerList(world: LedgerWorld, state: string): Promise<void> {
  expect(['一般可用', '垃圾桶']).toContain(state);
  const scope = state === '一般可用' ? 'active' : 'trash';

  expect(world.get('management:listScope')).toBe(scope);
  expect(world.response!.status()).toBe(200);
  const first = world.get<{ items: Record<string, unknown>[]; nextCursor: string | null }>(
    'management:firstPage',
  );
  const expected = await expectedOwnerList(world, scope);

  expect(first.items).toEqual(expected.slice(0, 50));
  if (expected.length <= 50) expect(first.nextCursor).toBeNull();
  else expect(first.nextCursor).toEqual(expect.any(String));
  const all = await ownerTripPages(world, scope);

  expect(
    all,
    'Every owner/state row exactly once, in cursor order, with no foreign or accounting projection',
  ).toEqual(expected);
  // The ordinary trip selector consumes the same active-list source, even while inspecting trash.
  if (scope === 'trash')
    expect(await ownerTripPages(world, 'active')).toEqual(await expectedOwnerList(world, 'active'));
  expect(await managementSnapshot(world)).toEqual(
    world.get<TripManagementSnapshot>('management:before'),
  );
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
}
