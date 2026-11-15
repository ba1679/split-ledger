import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../support/trip-management/context.js';
import type { SnackDraft } from '../../../support/trip-management/race-fixture.js';
import { managementSnapshot, managementTripId } from '../../../support/trip-management/baseline.js';
import { assertLifecycleTransition } from '../../../support/trip-management/lifecycle-result.js';
import {
  assertPreservedTrip,
  assertOtherDataUnchanged,
} from '../../../support/trip-management/preservation.js';
import { assertSnackSources } from '../../../support/trip-management/snack-result.js';

Then('垃圾桶中恰有一筆點心且其餘帳務保持', async ({ world }) => {
  expect(world.get('management:firstWriter')).toBe('保存點心');
  const original = world.get<TripManagementSnapshot>('management:raceOriginal');
  const draft = world.get<SnackDraft>('management:snackDraft');

  await assertLifecycleTransition(world, 'trash');
  await assertPreservedTrip(world);
  await assertOtherDataUnchanged(world);
  const after = await managementSnapshot(world);

  assertSnackSources(original, after, draft, world.users.get('Alice')!.id, managementTripId(world));
  expect(after.expenses.filter((row) => row.item === '點心')).toHaveLength(1);
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(original.trips[0]!.accounting_revision)) + 1n),
  );
  expect(String(after.trips[0]!.lifecycle_revision)).toBe(
    String(BigInt(String(original.trips[0]!.lifecycle_revision)) + 1n),
  );
  expect(String(after.trips[0]!.thumbnail_revision)).toBe(
    String(original.trips[0]!.thumbnail_revision),
  );
  expect(after.receipts).toHaveLength(original.receipts.length + 1);
  const originalFields = (row: Record<string, unknown>) => {
    const {
      accounting_revision: _accounting,
      lifecycle_revision: _lifecycle,
      deleted_at: _deleted,
      updated_at: _updated,
      ...rest
    } = row;

    return rest;
  };

  expect(after.trips.map(originalFields)).toEqual(original.trips.map(originalFields));
});
