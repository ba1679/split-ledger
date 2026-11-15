import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { CreateRejection } from './create-rejection.js';
import type { NewTripDraft } from './new-trip-fixture.js';
import { newTripRequestOutcome, type NewTripFlow } from './new-trip-flow.js';
import { managementUI } from './management-fixture.js';
import { assertNewTripFields, assertNewTripNotCreated } from './uncommitted-new-trip.js';
import { renderedImage } from '../thumbnail/rendered-image.js';

export async function assertCreateFailure(world: LedgerWorld): Promise<void> {
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  const rejection = world.get<CreateRejection>('management:createRejection');
  const draft = world.get<NewTripDraft>('management:newTripDraft');
  const tripId = world.get<string>('management:newTripId');

  expect(flow.errors.map(String)).toEqual([]);
  expect(rejection.errors().map(String)).toEqual([]);
  expect(flow.creates.length).toBe(1);
  expect(rejection.attempts().length).toBe(1);
  expect(rejection.attempts()[0]!.original).toMatchObject({ id: tripId, name: draft.name });
  expect(rejection.attempts()[0]!.wire).toMatchObject({ id: tripId, name: '' });
  const response = await newTripRequestOutcome(flow, flow.creates[0]!);

  expect(response?.status()).toBe(400);
  expect(await response!.json()).toMatchObject({
    code: 'VALIDATION_ERROR',
    message: expect.any(String),
  });
  expect(flow.images.length).toBe(0);
  expect((await world.db.query('SELECT id FROM trips WHERE id=$1', [tripId])).rows).toEqual([]);
  expect(
    (await world.db.query('SELECT trip_id FROM trip_id_reservations WHERE trip_id=$1', [tripId]))
      .rows,
  ).toEqual([]);
  expect(
    (await world.db.query('SELECT id FROM trip_members WHERE trip_id=$1', [tripId])).rows,
  ).toEqual([]);
  expect(
    (await world.db.query('SELECT trip_id FROM trip_thumbnails WHERE trip_id=$1', [tripId])).rows,
  ).toEqual([]);
  const { page } = managementUI(world);
  const dialog = page.getByRole('dialog');
  const errors = dialog.getByRole('alert').filter({ hasText: /\S/ });

  await expect(dialog).toBeVisible();
  await expect(errors.first()).toBeVisible();
  const text = (await errors.allTextContents()).join('\n');
  expect(text).toMatch(/不正確|未建立|無法|失敗|請填/);
  expect(text).not.toMatch(/結果.*(?:未知|尚未確認)|查證中|VALIDATION_ERROR/);
  expect(text).not.toContain(tripId);
  await expect(page.getByRole('status').filter({ hasText: /旅行已建立|建立成功/ })).toBeHidden();
  await expect(dialog.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '建立旅行', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: /^(重新選圖|選擇照片)$/ })).toBeEnabled();
  await assertNewTripFields(world);
  expect(draft.photo).toBe('合法神社');
  await expect(dialog.getByText(draft.file!.name, { exact: true })).toBeVisible();
  const image = dialog.locator('img[src^="blob:"]:visible');
  expect(await renderedImage(image)).toEqual({ width: 64, height: 48, rgba: [67, 140, 161, 255] });
  const source = await image.getAttribute('src');
  const bytes = await page.evaluate(
    async (url) => [...new Uint8Array(await (await fetch(url)).arrayBuffer())],
    source!,
  );
  expect(Buffer.from(bytes)).toEqual(draft.file!.bytes);
  await assertNewTripNotCreated(world, 1);
  world.set('management:failedCreateId', tripId);
  world.set('management:createFailureObserved', true);
}
