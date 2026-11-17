import { expect, type Request, type Response, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { installOwnedWriteRejection } from '../../../../api/tests/support/trip-management/write-rejection.js';
import type { NewTripDraft } from './new-trip-fixture.js';
import { managementUI } from './management-fixture.js';
import { installCreationAudit, creationAudit, restoreCreationAudit } from './creation-audit.js';

export interface NewTripFlow {
  creates: Request[];
  images: Request[];
  responses: Map<Request, Response>;
  failures: Map<Request, string>;
  lookups: Map<string, Response>;
  beforeImages: Map<Request, TripManagementSnapshot>;
  events: { phase: string; tripId: string }[];
  errors: unknown[];
  createStart: number;
  imageStart: number;
}

const originalCreateBodies = new WeakMap<Request, Record<string, unknown>>();

export function createTripBody(request: Request): Record<string, unknown> {
  const cached = originalCreateBodies.get(request);
  if (cached) return cached;
  try {
    const body = { ...(request.postDataJSON() as Record<string, unknown>) };
    Object.freeze(body);
    originalCreateBodies.set(request, body);

    return body;
  } catch {
    throw new Error('Observed CreateTrip must contain valid JSON');
  }
}

export async function observeNewTripFlow(world: LedgerWorld): Promise<NewTripFlow> {
  if (world.state.has('management:newTripFlow'))
    return world.get<NewTripFlow>('management:newTripFlow');
  const { page } = managementUI(world);
  await installCreationAudit(page);
  world.tripManagement.cleanups.add(async () => {
    await restoreCreationAudit(page);
  });
  const flow: NewTripFlow = {
    creates: [],
    images: [],
    responses: new Map(),
    failures: new Map(),
    lookups: new Map(),
    beforeImages: new Map(),
    events: [],
    errors: [],
    createStart: 0,
    imageStart: 0,
  };
  const imagePattern = /\/api\/trips\/[^/]+\/thumbnail(?:\?.*)?$/;
  const onRequest = (request: Request) => {
    const path = new URL(request.url()).pathname;
    try {
      if (request.method() === 'POST' && path === '/api/trips') {
        flow.creates.push(request);
        flow.events.push({ phase: 'create-request', tripId: String(createTripBody(request).id) });
      } else if (request.method() === 'POST' && /^\/api\/trips\/[^/]+\/thumbnail$/.test(path))
        flow.images.push(request);
    } catch (error) {
      flow.errors.push(error);
    }
  };
  const onResponse = (response: Response) => {
    const request = response.request();
    flow.responses.set(request, response);
    const path = new URL(request.url()).pathname;
    if (
      request.method() === 'GET' &&
      /^\/api\/trips\/[0-9a-f-]{36}$/i.test(path) &&
      response.status() === 200
    ) {
      flow.lookups.set(path.split('/')[3]!, response);
      flow.events.push({ phase: 'trip-lookup-response-200', tripId: path.split('/')[3]! });
    }
    if (flow.creates.includes(request))
      flow.events.push({
        phase: `create-response-${response.status()}`,
        tripId: String(createTripBody(request).id),
      });
  };
  const onFailed = (request: Request) => {
    flow.failures.set(request, request.failure()?.errorText ?? 'Request failed');
  };
  const handler = async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();

      return;
    }
    try {
      const request = route.request();
      const tripId = new URL(request.url()).pathname.split('/')[3]!;
      const creator = [...flow.creates].reverse().find((row) => createTripBody(row).id === tripId);
      expect(creator, 'A new thumbnail cannot precede its original create intent').toBeDefined();
      // Observe client JSON completion at fetch start; never let this server-side barrier
      // turn a premature client image into a correctly ordered write.
      const audit = (await creationAudit(page)).filter(
        (event) => event.kind === 'image-start' && event.tripId === tripId,
      );
      const attempt = audit.at(-1);
      expect(attempt, 'The native client image fetch must be observed').toBeDefined();
      expect(attempt!.operationId).toBe(request.headers()['x-operation-id']);
      expect(
        ['create', 'lookup'],
        'Client must complete native confirmation before image fetch',
      ).toContain(attempt!.source);
      flow.events.push({ phase: `image-confirmation-${attempt!.source}`, tripId });
      const created = await newTripRequestOutcome(flow, creator!);
      const confirmation = created?.status() === 201 ? created : flow.lookups.get(tripId);
      expect(
        confirmation,
        'Lost201 headers do not supersede an actual successful Trip lookup',
      ).toBeDefined();
      expect(await confirmation!.finished()).toBeNull();
      const confirmed = await confirmation!.json();
      const intent = createTripBody(creator!);
      expect(confirmed).toMatchObject({ id: tripId, name: intent.name });
      expect(confirmed.startDate ?? null).toBe(intent.startDate ?? null);
      expect(confirmed.endDate ?? null).toBe(intent.endDate ?? null);
      const before = await managementSnapshot(world, tripId);
      expect(before.trips).toHaveLength(1);
      expect(before.trips[0]!.owner_id).toBe(world.users.get('Alice')!.id);
      flow.beforeImages.set(request, before);
      flow.events.push({ phase: 'creation-confirmed-before-image', tripId });
      // New-form failure fixtures bind the real future trip only after its committed creation.
      if (world.state.has('management:deferNewTripThumbnailFailure')) {
        const fault = await installOwnedWriteRejection(
          world,
          'trip_thumbnails',
          world.users.get('Alice')!.id,
          tripId,
        );
        world.set('management:thumbnailFault', fault);
        world.state.delete('management:deferNewTripThumbnailFailure');
      }
      // Observe the original request; any earlier fixture route still runs, and the server remains real.
      await route.fallback();
    } catch (error) {
      flow.errors.push(error);
      await route.abort('failed').catch(() => {});
    }
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('requestfailed', onFailed);
  await page.route(imagePattern, handler);
  world.tripManagement.cleanups.add(async () => {
    page.off('request', onRequest);
    page.off('response', onResponse);
    page.off('requestfailed', onFailed);
    if (!page.isClosed()) await page.unroute(imagePattern, handler);
  });
  world.set('management:newTripFlow', flow);

  return flow;
}

export async function newTripRequestOutcome(
  flow: NewTripFlow,
  request: Request,
): Promise<Response | undefined> {
  await expect
    .poll(
      () => flow.responses.has(request) || flow.failures.has(request) || flow.errors.length > 0,
      { timeout: 15000 },
    )
    .toBe(true);
  expect(flow.errors.map(String)).toEqual([]);
  if (flow.failures.has(request)) return undefined;
  const response = flow.responses.get(request);
  if (response) {
    const completion: { ended: boolean; failure: Error | null } = { ended: false, failure: null };
    void response.finished().then(
      (error) => {
        completion.failure = error;
        completion.ended = true;
      },
      (error: unknown) => {
        completion.failure = error instanceof Error ? error : new Error(String(error));
        completion.ended = true;
      },
    );
    await expect
      .poll(() => completion.ended || flow.failures.has(request) || flow.errors.length > 0, {
        timeout: 15000,
      })
      .toBe(true);
    expect(flow.errors.map(String)).toEqual([]);
    if (flow.failures.has(request)) return undefined;
    if (completion.failure) {
      flow.failures.set(request, completion.failure.message);

      return undefined;
    }
    // WebKit can finish the headers successfully even when the JSON body was truncated.
    try {
      await response.json();
    } catch (error) {
      flow.failures.set(request, error instanceof Error ? error.message : String(error));

      return undefined;
    }
  }

  return response;
}

export async function submitNewTrip(world: LedgerWorld): Promise<void> {
  const flow = await observeNewTripFlow(world);
  const draft = world.get<NewTripDraft>('management:newTripDraft');
  const { page } = managementUI(world);
  flow.createStart = flow.creates.length;
  flow.imageStart = flow.images.length;
  await page.getByRole('dialog').getByRole('button', { name: '建立旅行', exact: true }).click();
  await expect.poll(() => flow.creates.length - flow.createStart).toBe(1);
  const request = flow.creates[flow.createStart]!;
  const body = createTripBody(request);

  expect(body.id).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  expect(body.name).toBe(draft.name);
  expect(body.startDate ?? null).toBe(draft.startDate);
  expect(body.endDate ?? null).toBe(draft.endDate);
  expect(
    Object.keys(body).every((key) => ['id', 'name', 'startDate', 'endDate'].includes(key)),
  ).toBe(true);
  world.set('management:newTripId', body.id);
  const response = await newTripRequestOutcome(flow, request);
  if (response?.status() === 201 && draft.photo === '合法神社') {
    await expect.poll(() => flow.images.length - flow.imageStart, { timeout: 15000 }).toBe(1);
    await newTripRequestOutcome(flow, flow.images[flow.imageStart]!);
  }
  expect(flow.errors.map(String)).toEqual([]);
}
