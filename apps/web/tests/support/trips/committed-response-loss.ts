import { expect, type APIResponse, type Request, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import type { RecordedTripCommand } from '../../../../api/tests/support/trip-management/commands.js';
import type { ThumbnailRequest } from '../../../../api/tests/support/trip-management/thumbnail-request.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { assertLifecycleTransition } from '../../../../api/tests/support/trip-management/lifecycle-result.js';
import {
  assertPreservedTrip,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { assertPurgedTrip } from '../../../../api/tests/support/trip-management/purge-result.js';
import { assertThumbnailSaved } from '../../../../api/tests/support/trip-management/thumbnail-result.js';
import { assertThumbnailReset } from '../../../../api/tests/support/trip-management/thumbnail-reset-result.js';
import { responseProxyControls, type ResponseProxyControl } from '../loading/response-proxy.js';
import type { ThumbnailDraft } from '../thumbnail/draft-fixture.js';
import type { NewTripDraft } from './new-trip-fixture.js';
import type { NewTripFlow } from './new-trip-flow.js';
import { managementUI } from './management-fixture.js';

export interface CommittedResponseLoss {
  operation: string;
  command?: RecordedTripCommand;
  request?: Request;
  before?: TripManagementSnapshot;
  after?: TripManagementSnapshot;
  outcome?: Record<string, unknown>;
  mutations: { method: string; path: string; tripId: string; operationId: string }[];
  verifications: { path: string; tripId?: string; operationId?: string; blocked: boolean }[];
  blocked: boolean;
  pendingVerificationFailures: number;
  releaseVerificationFailures(): void;
  done: boolean;
  failure?: unknown;
  finished: Promise<void>;
  unblock(): void;
  dispose(): Promise<void>;
}

/** The sole write is the browser's original native request; only its genuine response is truncated. */
export async function arrangeCommittedResponseLoss(
  world: LedgerWorld,
  operation: string,
  options: { holdVerificationFailures?: boolean } = {},
): Promise<CommittedResponseLoss> {
  expect(['移至垃圾桶', '永久刪除', '保存圖片', '新增附圖']).toContain(operation);
  const { page } = managementUI(world);
  const isNew = operation === '新增附圖';
  const isImage = isNew || operation === '保存圖片';
  const reset =
    !isNew && isImage && world.get<ThumbnailDraft>('management:draft').intent === 'reset';
  const method = reset ? 'DELETE' : 'POST';
  const kind = isImage
    ? reset
      ? 'reset_thumbnail'
      : 'save_thumbnail'
    : operation === '移至垃圾桶'
      ? 'move_to_trash'
      : 'purge';
  const suffix = isImage ? 'thumbnail' : operation === '移至垃圾桶' ? 'trash' : 'purge';
  const knownId = isNew ? undefined : managementTripId(world);
  const matches = (path: string, actualMethod: string) =>
    actualMethod === method &&
    (knownId
      ? path === `/api/trips/${knownId}/${suffix}`
      : /^\/api\/trips\/[0-9a-f-]{36}\/thumbnail$/i.test(path));
  let finish!: () => void,
    disposed = false;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const fail = (error: unknown) => {
    state.failure ??= error;
    state.done = true;
    finish();
  };
  let releaseVerification!: () => void;
  let holdVerification = options.holdVerificationFailures ?? false;
  const verificationGate = new Promise<void>((resolve) => {
    releaseVerification = resolve;
  });
  const observations = new Set<Promise<void>>();
  const state: CommittedResponseLoss = {
    operation,
    mutations: [],
    verifications: [],
    blocked: true,
    pendingVerificationFailures: 0,
    releaseVerificationFailures() {
      holdVerification = false;
      releaseVerification();
    },
    done: false,
    finished,
    unblock() {
      state.blocked = false;
    },
    dispose: async () => {
      if (disposed) return;
      try {
        await Promise.all(observations);
        state.releaseVerificationFailures();
        await expect.poll(() => state.pendingVerificationFailures).toBe(0);
        if (state.mutations.length)
          await expect
            .poll(() => state.done, {
              timeout: 15000,
              message: 'Original committed response interception must finish before cleanup',
            })
            .toBe(true);
      } finally {
        disposed = true;
        controls.delete(control);
        page.off('request', onRequest);
        page.off('requestfailed', onFailed);
        if (!page.isClosed()) await page.unroute(pattern, onVerification);
        world.tripManagement.cleanups.delete(state.dispose);
      }
      expect(state.failure, 'Real commit observation must not fail').toBeUndefined();
    },
  };
  const onRequest = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (!matches(path, request.method())) return;
    const observation = (async () => {
      try {
        const headers = await request.allHeaders();
        expect(headers.origin).toBe(world.get<string>('webOrigin'));
        const data = isImage ? undefined : (request.postDataJSON() as Record<string, unknown>);
        const operationId = String(isImage ? headers['x-operation-id'] : data!.operationId);
        const tripId = path.split('/')[3]!;
        expect(operationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
        state.mutations.push({ method: request.method(), path, tripId, operationId });
        expect(state.mutations.length, 'Unknown outcome must not cause another mutation').toBe(1);
        state.request = request;
        state.command = {
          tripId,
          operationId,
          kind,
          method: request.method(),
          path,
          headers: { origin: headers.origin! },
          ...(data ? { data } : {}),
        };
      } catch (error) {
        fail(error);
      }
    })();
    observations.add(observation);
    void observation.finally(() => observations.delete(observation));
  };
  const onFailed = (request: Request) => {
    if (!state.done && matches(new URL(request.url()).pathname, request.method()))
      fail(
        new Error('Original write disconnected before its committed upstream result was observed'),
      );
  };
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const control: ResponseProxyControl = {
    matches(request) {
      return (
        !state.done &&
        matches(new URL(request.url!, 'http://test.invalid').pathname, request.method!)
      );
    },
    async handle(exchange) {
      expect(state.failure).toBeUndefined();
      expect(
        exchange.status,
        'Response loss only applies to genuinely committed 200 commands',
      ).toBe(200);
      await expect.poll(() => state.command !== undefined).toBe(true);
      const command = state.command!;
      expect(state.mutations.length).toBe(1);
      expect(exchange.path).toBe(command.path);
      const parsed = JSON.parse(exchange.body.toString()) as Record<string, unknown>;
      // A read-only view of captured upstream bytes. No status/body fields are invented.
      const actual: Pick<APIResponse, 'status' | 'json'> = {
        status: () => exchange.status,
        json: async () => parsed,
      };
      state.before = isNew
        ? world.get<NewTripFlow>('management:newTripFlow').beforeImages.get(state.request!)!
        : world.get<TripManagementSnapshot>('management:before');
      expect(state.before).toBeDefined();
      world.set('management:lastCommand', command);
      if (kind === 'move_to_trash') {
        await assertLifecycleTransition(world, 'trash', actual, command);
        await assertPreservedTrip(world, actual);
      } else if (kind === 'purge') await assertPurgedTrip(world, actual, command);
      else if (kind === 'reset_thumbnail') await assertThumbnailReset(world, actual, command);
      else {
        const file = isNew
          ? world.get<NewTripDraft>('management:newTripDraft').file!
          : world.get<ThumbnailDraft>('management:draft').file!;
        const headers = await state.request!.allHeaders();
        world.set('management:thumbnailRequest', {
          tripId: command.tripId,
          operationId: command.operationId,
          lifecycleRevision: headers['x-expected-lifecycle-revision']!,
          thumbnailRevision: headers['x-expected-thumbnail-revision']!,
          hashes: [file.asset.sha256],
        } satisfies ThumbnailRequest);
        await assertThumbnailSaved(world, actual, state.before);
      }
      if (isNew) expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
      await assertOtherDataUnchanged(world);
      state.after = await managementSnapshot(world, command.tripId);
      state.outcome = parsed;
      state.done = true;
      finish();

      return 'drop';
    },
    failed: fail,
  };
  const pattern = '**/api/**';
  const onVerification = async (route: Route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' || !state.mutations.length) {
      await route.fallback();

      return;
    }
    const protocol = path.match(/^\/api\/trips\/([^/]+)\/(?:state|operations\/([^/]+))$/);
    const target = state.command?.tripId;
    const relevant =
      Boolean(protocol) ||
      path === '/api/trips' ||
      path === '/api/trips/trash' ||
      Boolean(
        target &&
        (path === `/api/trips/${target}` ||
          path.startsWith(`/api/trips/${target}/thumbnail/`) ||
          path.startsWith(`/api/trips/trash/${target}/thumbnail/`)),
      );
    if (!relevant) {
      await route.fallback();

      return;
    }
    state.verifications.push({
      path,
      ...(protocol ? { tripId: protocol[1], operationId: protocol[2] } : {}),
      blocked: state.blocked,
    });
    if (state.blocked) {
      const held = holdVerification && Boolean(protocol);
      if (held) state.pendingVerificationFailures++;
      try {
        if (held) await verificationGate;
        if (!page.isClosed()) await route.abort('failed');
      } catch (error) {
        if (!page.isClosed()) fail(error);
      } finally {
        if (held) state.pendingVerificationFailures--;
      }
    } else await route.fallback();
  };
  page.on('request', onRequest);
  page.on('requestfailed', onFailed);
  controls.add(control);
  await page.route(pattern, onVerification);
  world.tripManagement.cleanups.add(state.dispose);
  world.set('management:responseLoss', state);

  return state;
}
