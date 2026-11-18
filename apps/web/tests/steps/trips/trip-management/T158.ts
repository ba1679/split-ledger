import { Then, expect } from '../../../support/fixtures.js';
import type { Request, Response } from '@playwright/test';
import type { ThumbnailRequest } from '../../../../../api/tests/support/trip-management/thumbnail-request.js';
import { assertThumbnailSaved } from '../../../../../api/tests/support/trip-management/thumbnail-result.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../../api/tests/support/trip-management/preservation.js';
import { createTripBody, type NewTripFlow } from '../../../support/trips/new-trip-flow.js';
import type { CreateResponseLoss } from '../../../support/trips/create-response-loss.js';
import type { NewTripDraft } from '../../../support/trips/new-trip-fixture.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import { renderedImage } from '../../../support/thumbnail/rendered-image.js';
import { assertDraftUrlsReleased } from '../../../support/thumbnail/object-urls.js';

Then('原旅行確認後才續存同旅行照片', async ({ world, browser }) => {
  const loss = world.get<CreateResponseLoss>('management:createResponseLoss');
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  const saved = world.get<{ request: Request; response: Response }>(
    'management:verifiedCreationImage',
  );
  const draft = world.get<NewTripDraft>('management:newTripDraft'),
    tripId = loss.tripId!;
  expect(flow.creates.length).toBe(1);
  expect(createTripBody(flow.creates[0]!).id).toBe(tripId);
  expect(flow.failures.has(flow.creates[0]!)).toBe(true);
  expect(flow.images.length).toBe(1);
  expect(flow.errors.map(String)).toEqual([]);
  const phases = flow.events.filter((event) => event.tripId === tripId).map((event) => event.phase);
  expect(phases).toContain('image-confirmation-lookup');
  expect(phases.indexOf('image-confirmation-lookup')).toBeGreaterThan(
    phases.indexOf('trip-lookup-response-200'),
  );
  expect(phases.indexOf('creation-confirmed-before-image')).toBeGreaterThan(
    phases.indexOf('image-confirmation-lookup'),
  );
  const beforeImage = flow.beforeImages.get(saved.request);
  expect(beforeImage).toEqual(loss.created);
  const headers = saved.request.headers(),
    operationId = headers['x-operation-id']!;
  expect(operationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  expect(headers['x-expected-lifecycle-revision']).toBe('0');
  expect(headers['x-expected-thumbnail-revision']).toBe('0');
  world.set('management:thumbnailRequest', {
    tripId,
    operationId,
    lifecycleRevision: '0',
    thumbnailRevision: '0',
    hashes: [draft.file!.asset.sha256],
  } satisfies ThumbnailRequest);
  await assertThumbnailSaved(world, saved.response, beforeImage);
  const after = await managementSnapshot(world, tripId);
  const owner = world.users.get('Alice')!.id;
  const expectedIds = [...world.get<string[]>('management:newTripIdsBefore'), tripId].sort();
  for (const sql of [
    'SELECT id FROM trips WHERE owner_id=$1 ORDER BY id',
    'SELECT trip_id AS id FROM trip_id_reservations WHERE owner_id=$1 ORDER BY trip_id',
  ])
    expect((await world.db.query(sql, [owner])).rows.map((row: { id: string }) => row.id)).toEqual(
      expectedIds,
    );
  expect(
    (
      await world.db.query('SELECT id FROM trips WHERE owner_id=$1 AND name=$2', [
        owner,
        draft.name,
      ])
    ).rows,
  ).toEqual([{ id: tripId }]);
  const ui = managementUI(world),
    page = ui.page;
  await expect(page.getByRole('heading', { name: draft.name, exact: true })).toBeVisible();
  await waitForManagementReads(ui);
  await expect(page.getByText(/結果尚未確認|無法確認.*建立/)).toBeHidden();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  if (!(await page.getByRole('dialog').isVisible())) await assertDraftUrlsReleased(page);
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport:
      page.viewportSize()!.width < 600 ? { width: 1440, height: 900 } : { width: 390, height: 844 },
  });
  try {
    await other.addCookies(await page.context().cookies());
    const trip = await other.request.get(`/api/trips/${tripId}`);
    expect(trip.status()).toBe(200);
    expect(await trip.json()).toMatchObject({
      id: tripId,
      name: draft.name,
      startDate: null,
      endDate: null,
      hasThumbnail: true,
      thumbnailRevision: '1',
    });
    const view = await other.newPage();
    await view.goto('/trips');
    const card = view
      .getByRole('link')
      .filter({ has: view.getByRole('heading', { name: draft.name, exact: true }) });
    await expect(card).toHaveAttribute('href', `/trips/${tripId}`);
    const pixels = await renderedImage(card.locator('img:visible'));
    expect(pixels.width).toBe(64);
    expect(pixels.height).toBe(48);
    for (const [index, value] of [67, 140, 161, 255].entries())
      expect(Math.abs(pixels.rgba[index]! - value)).toBeLessThanOrEqual(5);
  } finally {
    await other.close();
  }
  expect(ui.writes.length).toBe(2);
  expect(await managementSnapshot(world, tripId)).toEqual(after);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  await assertOtherDataUnchanged(world);
});
