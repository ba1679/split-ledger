import { expect, type Browser } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { ThumbnailRequest } from '../../../../api/tests/support/trip-management/thumbnail-request.js';
import { assertThumbnailSaved } from '../../../../api/tests/support/trip-management/thumbnail-result.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { ownerTripPages } from '../../../../api/tests/support/trip-management/lifecycle-result.js';
import { renderedImage } from '../thumbnail/rendered-image.js';
import { managementUI, waitForManagementReads } from './management-fixture.js';
import { createTripBody, newTripRequestOutcome, type NewTripFlow } from './new-trip-flow.js';
import type { NewTripDraft } from './new-trip-fixture.js';

export async function assertNewTrip(
  world: LedgerWorld,
  browser: Browser,
  picture: string,
): Promise<void> {
  expect(['預設', '神社']).toContain(picture);
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  const draft = world.get<NewTripDraft>('management:newTripDraft');
  const tripId = world.get<string>('management:newTripId');
  const creates = flow.creates.filter(
    (request) => flow.responses.get(request)?.status() === 201 && !flow.failures.has(request),
  );

  expect(flow.errors.map(String)).toEqual([]);
  expect(creates.length).toBe(1);
  expect(flow.creates.length).toBe(flow.createStart + 1);
  expect(flow.creates.every((request) => createTripBody(request).id === tripId)).toBe(true);
  if (world.state.has('management:failedCreateId'))
    expect(tripId).toBe(world.get('management:failedCreateId'));
  const created = await newTripRequestOutcome(flow, creates[0]!);
  expect(created?.status()).toBe(201);
  const body = await created!.json();
  const ownerId = world.users.get('Alice')!.id;
  const matches = (
    await world.db.query('SELECT * FROM trips WHERE owner_id=$1 AND name=$2', [ownerId, draft.name])
  ).rows;

  expect(matches).toHaveLength(1);
  expect(matches[0]).toMatchObject({
    id: tripId,
    owner_id: ownerId,
    name: draft.name,
    start_date: draft.startDate,
    end_date: draft.endDate,
    deleted_at: null,
  });
  expect(body).toMatchObject({
    id: tripId,
    name: draft.name,
    startDate: draft.startDate,
    endDate: draft.endDate,
    lifecycleRevision: '0',
    thumbnailRevision: '0',
    hasThumbnail: false,
  });
  const after = await managementSnapshot(world, tripId);

  expect(after.members).toHaveLength(1);
  expect(after.members[0]).toMatchObject({
    id: body.ownerMemberId,
    trip_id: tripId,
    owner_id: ownerId,
    role: 'owner',
    name: 'Alice',
    is_active: true,
  });
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual([]);
  expect(String(after.trips[0]!.accounting_revision)).toBe('0');
  expect(String(after.trips[0]!.lifecycle_revision)).toBe('0');
  expect(after.reservations).toHaveLength(1);
  expect(after.reservations[0]).toMatchObject({
    trip_id: tripId,
    owner_id: ownerId,
    purged_at: null,
  });
  const oldIds = world.get<string[]>('management:newTripIdsBefore');
  const actualIds = (
    await world.db.query('SELECT id FROM trips WHERE owner_id=$1 ORDER BY id', [ownerId])
  ).rows.map((row: { id: string }) => row.id);

  expect(actualIds).toEqual([...oldIds, tripId].sort());
  if (picture === '神社') {
    expect(draft.photo).toBe('合法神社');
    expect(flow.images.length).toBe(flow.imageStart + 1);
    expect(
      flow.images.every(
        (request) => new URL(request.url()).pathname === `/api/trips/${tripId}/thumbnail`,
      ),
    ).toBe(true);
    const imageRequest = flow.images.at(-1)!;
    const response = await newTripRequestOutcome(flow, imageRequest);
    expect(response?.status()).toBe(200);
    expect(
      flow.images.filter((request) => flow.responses.get(request)?.status() === 200).length,
    ).toBe(1);
    const before = flow.beforeImages.get(imageRequest)!;
    expect(before).toBeDefined();
    const headers = imageRequest.headers();
    const operationId = headers['x-operation-id'];
    expect(operationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
    expect(headers['x-expected-lifecycle-revision']).toBe(
      String(before.trips[0]!.lifecycle_revision),
    );
    expect(headers['x-expected-thumbnail-revision']).toBe(
      String(before.trips[0]!.thumbnail_revision),
    );
    if (world.state.has('management:failedThumbnailOperationId'))
      expect(operationId).not.toBe(world.get('management:failedThumbnailOperationId'));
    world.set('management:thumbnailRequest', {
      tripId,
      operationId: operationId!,
      lifecycleRevision: headers['x-expected-lifecycle-revision']!,
      thumbnailRevision: headers['x-expected-thumbnail-revision']!,
      hashes: [draft.file!.asset.sha256],
    } satisfies ThumbnailRequest);
    await assertThumbnailSaved(world, response!, before);
    const receipt = await ownerRead(world, `/api/trips/${tripId}/operations/${operationId}`);
    expect(receipt.status()).toBe(200);
    expect(await receipt.json()).toEqual(await response!.json());
    const phases = flow.events.map((event) => event.phase);
    expect(phases.lastIndexOf('creation-confirmed-before-image')).toBeGreaterThan(
      phases.indexOf('create-response-201'),
    );
  } else {
    expect(draft.photo).toBe('無');
    expect(flow.images.length).toBe(0);
    expect(after.thumbnails).toEqual([]);
    expect(after.receipts).toEqual([]);
    expect(String(after.trips[0]!.thumbnail_revision)).toBe('0');
  }
  const active = await ownerTripPages(world, 'active');
  expect(active.filter((row) => row.id === tripId)).toHaveLength(1);
  const ui = managementUI(world);
  await expect(ui.page.getByRole('heading', { name: draft.name, exact: true })).toBeVisible();
  await waitForManagementReads(ui);
  if (
    world.state.has('management:createFailureCleared') ||
    world.state.has('management:newTripRetryReady')
  ) {
    await expect(ui.page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
    await expect(ui.page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(ui.page.getByRole('progressbar')).toHaveCount(0);
  }
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: ui.page.viewportSize(),
  });
  try {
    await other.addCookies(await ui.page.context().cookies());
    const page = await other.newPage();
    await page.goto('/trips');
    const card = page
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { name: draft.name, exact: true }) });
    await expect(card).toHaveAttribute('href', `/trips/${tripId}`);
    if (picture === '神社') {
      const image = await renderedImage(card.locator('img:visible'));
      expect(image.width).toBe(64);
      expect(image.height).toBe(48);
      for (const [index, value] of [67, 140, 161, 255].entries())
        expect(Math.abs(image.rgba[index]! - value)).toBeLessThanOrEqual(5);
    } else {
      await expect(card.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
      await expect(
        card.locator('.landscape:visible,[role="img"]:visible,img:visible').first(),
      ).toBeVisible();
    }
    const trip = await other.request.get(`/api/trips/${tripId}`);
    expect(trip.status()).toBe(200);
    expect(await trip.json()).toMatchObject({
      id: tripId,
      name: draft.name,
      startDate: draft.startDate,
      endDate: draft.endDate,
      hasThumbnail: picture === '神社',
      ownerMemberId: body.ownerMemberId,
    });
  } finally {
    await other.close();
  }
  expect(ui.writes.length).toBe(flow.creates.length + flow.images.length);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  expect(await managementSnapshot(world, tripId)).toEqual(after);
  await assertOtherDataUnchanged(world);
}
