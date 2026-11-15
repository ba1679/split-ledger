import { expect, type Browser } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { OwnedWriteRejection } from '../../../../api/tests/support/trip-management/write-rejection.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../api/tests/support/trip-management/rejections.js';
import { createTripBody, newTripRequestOutcome, type NewTripFlow } from './new-trip-flow.js';
import type { NewTripDraft } from './new-trip-fixture.js';
import { managementUI, waitForManagementReads } from './management-fixture.js';

export async function assertNewTripImageFailure(
  world: LedgerWorld,
  browser: Browser,
): Promise<void> {
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  const draft = world.get<NewTripDraft>('management:newTripDraft');
  const tripId = world.get<string>('management:newTripId');
  const fault = world.get<OwnedWriteRejection>('management:thumbnailFault');

  expect(flow.errors.map(String)).toEqual([]);
  expect(flow.creates.length).toBe(1);
  expect(flow.images.length).toBe(1);
  expect(createTripBody(flow.creates[0]!).id).toBe(tripId);
  const created = await newTripRequestOutcome(flow, flow.creates[0]!);
  expect(created?.status()).toBe(201);
  const createBody = await created!.json();
  const request = flow.images[0]!;
  const response = await newTripRequestOutcome(flow, request);
  expect(response?.status()).toBe(400);
  expect(await response!.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  expect(await fault.attempts()).toBe(1);
  const beforeImage = flow.beforeImages.get(request)!;
  expect(beforeImage).toBeDefined();
  const after = await managementSnapshot(world, tripId);
  expect(after).toEqual(beforeImage);
  expect(after.trips).toHaveLength(1);
  expect(after.trips[0]).toMatchObject({
    id: tripId,
    name: draft.name,
    owner_id: world.users.get('Alice')!.id,
    deleted_at: null,
    start_date: draft.startDate,
    end_date: draft.endDate,
  });
  expect(String(after.trips[0]!.thumbnail_revision)).toBe('0');
  expect(after.members).toHaveLength(1);
  expect(after.members[0]).toMatchObject({
    id: createBody.ownerMemberId,
    role: 'owner',
    is_active: true,
  });
  expect(after.thumbnails).toEqual([]);
  expect(after.receipts).toEqual([]);
  const headers = request.headers();
  const operationId = headers['x-operation-id'];
  expect(operationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  expect(new URL(request.url()).pathname).toBe(`/api/trips/${tripId}/thumbnail`);
  expect(headers.origin).toBe(world.get('webOrigin'));
  expect(headers['x-expected-lifecycle-revision']).toBe(
    String(beforeImage.trips[0]!.lifecycle_revision),
  );
  expect(headers['x-expected-thumbnail-revision']).toBe('0');
  const state = await ownerRead(world, `/api/trips/${tripId}/state`);
  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(after));
  const receipt = await ownerRead(world, `/api/trips/${tripId}/operations/${operationId}`);
  expect(receipt.status()).toBe(404);
  expect(await receipt.json()).toMatchObject({ code: 'OPERATION_NOT_FOUND' });
  const trip = await ownerRead(world, `/api/trips/${tripId}`);
  expect(trip.status()).toBe(200);
  expect(await trip.json()).toMatchObject({
    id: tripId,
    name: draft.name,
    hasThumbnail: false,
    ownerMemberId: createBody.ownerMemberId,
  });
  const ownerRows = await world.db.query('SELECT id FROM trips WHERE owner_id=$1 AND name=$2', [
    world.users.get('Alice')!.id,
    draft.name,
  ]);
  expect(ownerRows.rows).toEqual([{ id: tripId }]);
  const ids = (
    await world.db.query('SELECT id FROM trips WHERE owner_id=$1 ORDER BY id', [
      world.users.get('Alice')!.id,
    ])
  ).rows.map((row: { id: string }) => row.id);
  expect(ids).toEqual([...world.get<string[]>('management:newTripIdsBefore'), tripId].sort());
  const ui = managementUI(world),
    { page } = ui;
  await waitForManagementReads(ui);
  await expect(
    page.getByRole('alert').filter({ hasText: /旅行已建立.*圖片未保存/s }),
  ).toBeVisible();
  await expect(page.getByText(/(?:目前|現在).*預設風景/)).toBeVisible();
  await expect(page.getByRole('button', { name: '重新上傳', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '建立旅行', exact: true })).toHaveCount(0);
  await expect(page.getByText(/旅行建立失敗|整趟.*失敗/)).toBeHidden();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const card = page.getByRole('link').filter({ has: page.getByText(draft.name, { exact: true }) });
  await expect(card).toHaveAttribute('href', `/trips/${tripId}`);
  await expect(card.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
  expect(draft.file).toBeDefined();
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: page.viewportSize(),
  });
  try {
    await other.addCookies(await page.context().cookies());
    const otherPage = await other.newPage();
    await otherPage.goto('/trips');
    const same = otherPage
      .getByRole('link')
      .filter({ has: otherPage.getByRole('heading', { name: draft.name, exact: true }) });
    await expect(same).toHaveAttribute('href', `/trips/${tripId}`);
    await expect(same.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
    await expect(
      same.locator('.landscape:visible,[role="img"]:visible,img:visible').first(),
    ).toBeVisible();
  } finally {
    await other.close();
  }
  expect(ui.writes.length).toBe(2);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  expect(await managementSnapshot(world, tripId)).toEqual(after);
  await assertOtherDataUnchanged(world);
  world.set('management:failedThumbnailOperationId', operationId);
  world.set('management:newTripImageFailureObserved', true);
}
