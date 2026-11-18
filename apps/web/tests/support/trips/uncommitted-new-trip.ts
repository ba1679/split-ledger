import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { UploadImage } from '../../../../api/tests/support/trip-management/generated-images.js';
import { ownerTripPages } from '../../../../api/tests/support/trip-management/lifecycle-result.js';
import { managementUI } from './management-fixture.js';
import type { NewTripDraft } from './new-trip-fixture.js';
import { assertManagementUnchanged } from './management-assertions.js';

export interface NewTripSelection {
  photo: string;
  file?: UploadImage;
  fields: { name: string; start: string; end: string };
  ids: string[];
}

export function newTripFields(world: LedgerWorld) {
  if (world.state.has('management:newTripSelection'))
    return world.get<NewTripSelection>('management:newTripSelection').fields;
  const draft = world.get<NewTripDraft>('management:newTripDraft');

  return { name: draft.name, start: '', end: '' };
}

export async function assertNewTripFields(world: LedgerWorld): Promise<void> {
  const fields = newTripFields(world);
  const dialog = managementUI(world).page.getByRole('dialog');
  for (const [label, value] of [
    [/^旅行名稱$/, fields.name],
    [/^開始日/, fields.start],
    [/^結束日/, fields.end],
  ] as const) {
    const input = dialog.getByRole('textbox', { name: label });
    await expect(input).toHaveValue(value);
    await expect(input).toBeEnabled();
  }
}

export async function assertNewTripNotCreated(
  world: LedgerWorld,
  allowedWrites = 0,
): Promise<void> {
  const ownerId = world.users.get('Alice')!.id;
  const idsBefore = world.state.has('management:newTripSelection')
    ? world.get<NewTripSelection>('management:newTripSelection').ids
    : world.get<string[]>('management:newTripIdsBefore');
  const trips = await world.db.query('SELECT id FROM trips WHERE owner_id=$1 ORDER BY id', [
    ownerId,
  ]);
  const reservations = await world.db.query(
    'SELECT trip_id FROM trip_id_reservations WHERE owner_id=$1 ORDER BY trip_id',
    [ownerId],
  );

  expect(trips.rows.map((row: { id: string }) => row.id)).toEqual(idsBefore);
  expect(reservations.rows.map((row: { trip_id: string }) => row.trip_id)).toEqual(idsBefore);
  expect(
    (
      await world.db.query('SELECT id FROM trips WHERE owner_id=$1 AND name=$2', [
        ownerId,
        '京都賞楓',
      ])
    ).rows,
  ).toEqual([]);
  const active = await ownerTripPages(world, 'active');
  const trash = await ownerTripPages(world, 'trash');

  expect([...active, ...trash].map((row) => String(row.id)).sort()).toEqual(idsBefore);
  expect([...active, ...trash].some((row) => row.name === '京都賞楓')).toBe(false);
  await assertManagementUnchanged(world, allowedWrites);
}
