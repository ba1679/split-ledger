import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { installOwnedWriteRejection } from '../../../../api/tests/support/trip-management/write-rejection.js';
import { managementUI } from '../trips/management-fixture.js';
import { assertNewTripNotCreated } from '../trips/uncommitted-new-trip.js';
import type { ThumbnailDraft } from './draft-fixture.js';
import { assertThumbnailFailure } from './failure-result.js';

export async function armThumbnailFailure(world: LedgerWorld) {
  if (managementUI(world).state === '新增表單') {
    await assertNewTripNotCreated(world);
    world.set('management:deferNewTripThumbnailFailure', true);

    return undefined;
  }
  const fault = await installOwnedWriteRejection(
    world,
    'trip_thumbnails',
    world.users.get('Alice')!.id,
    managementTripId(world),
  );

  expect(await fault.attempts()).toBe(0);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  expect(managementUI(world).writes).toEqual([]);
  world.set('management:thumbnailFault', fault);

  return fault;
}

export async function arrangeResolvedThumbnailFailure(world: LedgerWorld): Promise<void> {
  const fault = await armThumbnailFailure(world);
  if (!fault) throw new Error('Existing-thumbnail retry requires the editor fixture');
  const ui = managementUI(world);
  const draft = world.get<ThumbnailDraft>('management:draft');

  // Arrange the prior failed intent using the real UI, then remove only its scoped rejection.
  await ui.page.getByRole('dialog').getByRole('button', { name: '保存圖片', exact: true }).click();
  await assertThumbnailFailure(world, draft.name);
  expect(ui.writes).toHaveLength(1);
  await fault.dispose();
  expect(world.tripManagement.cleanups.has(fault.dispose)).toBe(false);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  world.set('management:writeStart', ui.writes.length);
  world.set('management:previousImageFailureCleared', true);
}
