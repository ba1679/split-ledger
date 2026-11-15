import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import { responseProxyControls, type ResponseProxyControl } from '../loading/response-proxy.js';
import { arrangeManagementPage, managementUI } from './management-fixture.js';
import { arrangeNewTripDraft, type NewTripDraft } from './new-trip-fixture.js';
import {
  createTripBody,
  observeNewTripFlow,
  newTripRequestOutcome,
  type NewTripFlow,
} from './new-trip-flow.js';

export interface CreateResponseLoss {
  arrived: boolean;
  finished: boolean;
  released: boolean;
  blocked: boolean;
  error?: unknown;
  tripId?: string;
  body?: Record<string, unknown>;
  created?: TripManagementSnapshot;
  verifications: { path: string; tripId?: string; state: boolean; blocked: boolean }[];
  releaseTransport(): void;
  unblock(): void;
}

/** Hold genuine committed201 bytes until When, then truncate; authority GETs remain unavailable. */
export async function arrangeCreateResponseLoss(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeManagementPage(page, world, '新增表單');
  await arrangeNewTripDraft(world, '合法神社');
  const flow = await observeNewTripFlow(world),
    draft = world.get<NewTripDraft>('management:newTripDraft');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loss: CreateResponseLoss = {
    arrived: false,
    finished: false,
    released: false,
    blocked: true,
    verifications: [],
    releaseTransport() {
      loss.released = true;
      release();
    },
    unblock() {
      loss.blocked = false;
    },
  };
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const control: ResponseProxyControl = {
    matches(request) {
      return (
        !loss.arrived &&
        request.method === 'POST' &&
        new URL(request.url!, 'http://test.invalid').pathname === '/api/trips'
      );
    },
    async handle(exchange) {
      expect(exchange.status, 'Only a genuine committed creation is held').toBe(201);
      expect(flow.creates).toHaveLength(1);
      const original = createTripBody(flow.creates[0]!);
      const tripId = String(original.id);
      expect(tripId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
      expect(original.name).toBe(draft.name);
      expect(original.startDate ?? null).toBe(draft.startDate);
      expect(original.endDate ?? null).toBe(draft.endDate);
      const body = JSON.parse(exchange.body.toString()) as Record<string, unknown>;
      expect(body).toMatchObject({
        id: tripId,
        name: draft.name,
        startDate: draft.startDate,
        endDate: draft.endDate,
        hasThumbnail: false,
        lifecycleRevision: '0',
        thumbnailRevision: '0',
      });
      const created = await managementSnapshot(world, tripId);
      expect(created.trips).toHaveLength(1);
      expect(created.trips[0]).toMatchObject({
        id: tripId,
        owner_id: world.users.get('Alice')!.id,
        name: draft.name,
        deleted_at: null,
      });
      for (const field of ['lifecycle_revision', 'thumbnail_revision', 'accounting_revision'])
        expect(String(created.trips[0]![field])).toBe('0');
      expect(created.members).toHaveLength(1);
      expect(created.members[0]).toMatchObject({
        id: body.ownerMemberId,
        owner_id: world.users.get('Alice')!.id,
        trip_id: tripId,
        role: 'owner',
        is_active: true,
      });
      expect(created.reservations).toHaveLength(1);
      expect(created.reservations[0]).toMatchObject({
        trip_id: tripId,
        owner_id: world.users.get('Alice')!.id,
        purged_at: null,
      });
      for (const field of [
        'expenses',
        'shares',
        'repayments',
        'settlements',
        'adjustments',
        'thumbnails',
        'receipts',
      ] as const)
        expect(created[field]).toEqual([]);
      const matches = await world.db.query('SELECT id FROM trips WHERE owner_id=$1 AND name=$2', [
        world.users.get('Alice')!.id,
        draft.name,
      ]);
      expect(matches.rows).toEqual([{ id: tripId }]);
      expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
      await assertOtherDataUnchanged(world);
      loss.tripId = tripId;
      loss.body = body;
      loss.created = created;
      world.set('management:newTripId', tripId);
      loss.arrived = true;
      try {
        await gate;

        return 'drop';
      } finally {
        loss.finished = true;
      }
    },
    failed(error) {
      loss.error = error;
      loss.finished = true;
    },
  };
  const pattern = '**/api/**';
  const verify = async (route: Route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const match = path.match(/^\/api\/trips\/([0-9a-f-]{36})(\/state)?$/i);
    if (
      request.method() !== 'GET' ||
      !flow.creates.length ||
      (!match && !['/api/trips', '/api/trips/trash'].includes(path))
    ) {
      await route.fallback();

      return;
    }
    loss.verifications.push({
      path,
      ...(match ? { tripId: match[1] } : {}),
      state: Boolean(match?.[2]),
      blocked: loss.blocked,
    });
    if (loss.blocked) await route.abort('failed');
    else await route.fallback();
  };
  controls.add(control);
  await page.route(pattern, verify);
  world.tripManagement.cleanups.add(async () => {
    loss.releaseTransport();
    try {
      if (loss.arrived) await expect.poll(() => loss.finished).toBe(true);
    } finally {
      controls.delete(control);
      if (!page.isClosed()) await page.unroute(pattern, verify);
    }
    expect(loss.error).toBeUndefined();
    expect(flow.creates).toHaveLength(1);
  });
  world.set('management:createResponseLoss', loss);
  await page.getByRole('dialog').getByRole('button', { name: '建立旅行', exact: true }).click();
  await expect.poll(() => loss.arrived || loss.error !== undefined, { timeout: 15000 }).toBe(true);
  expect(loss.error).toBeUndefined();
  expect(loss.finished).toBe(false);
  expect(loss.released).toBe(false);
  expect(flow.images).toHaveLength(0);
  expect(managementUI(world).writes.length).toBe(1);
}

export async function releaseCreateResponseLoss(world: LedgerWorld): Promise<void> {
  const loss = world.get<CreateResponseLoss>('management:createResponseLoss');
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  expect(loss.arrived).toBe(true);
  expect(loss.released).toBe(false);
  loss.releaseTransport();
  await expect.poll(() => loss.finished).toBe(true);
  expect(loss.error).toBeUndefined();
  expect(await newTripRequestOutcome(flow, flow.creates[0]!)).toBeUndefined();
  await expect
    .poll(() => loss.verifications.some((row) => row.state && row.tripId === loss.tripId), {
      timeout: 15000,
    })
    .toBe(true);
  expect(flow.creates).toHaveLength(1);
  expect(flow.images).toHaveLength(0);
  expect(managementUI(world).writes.length).toBe(1);
}
