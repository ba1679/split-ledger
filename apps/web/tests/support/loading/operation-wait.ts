import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { arrangeOperationData, type OperationData } from './operation-data.js';
import {
  responseProxyControls,
  type ProxyExchange,
  type ResponseProxyControl,
} from './response-proxy.js';

export interface OperationWait extends OperationData {
  before: TripManagementSnapshot;
  after?: TripManagementSnapshot;
  committedTripId?: string;
  body?: unknown;
  box?: { x: number; y: number; width: number; height: number };
  focus?: string | null;
  exchanges: ProxyExchange[];
  errors: unknown[];
  finished: number;
  released: boolean;
  release(): void;
}

export async function arrangeOperationWait(
  page: Page,
  world: LedgerWorld,
  operation: string,
  prepared?: OperationData,
): Promise<void> {
  const data = prepared ?? (await arrangeOperationData(page, world, operation));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state: OperationWait = {
    ...data,
    before: await managementSnapshot(world),
    exchanges: [],
    errors: [],
    finished: 0,
    released: false,
    release() {
      state.released = true;
      release();
    },
  };
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const control: ResponseProxyControl = {
    matches: (request) =>
      request.method === data.method &&
      new URL(request.url!, 'http://test.invalid').pathname === data.path,
    async handle(exchange) {
      state.exchanges.push(exchange);
      try {
        expect(exchange.status).toBe(data.status);
        if (exchange.body.length) state.body = JSON.parse(exchange.body.toString());
        const tripId =
          operation === '建立旅行' ? String((state.body as { id: string }).id) : data.tripId;
        state.committedTripId = tripId;
        state.after = await managementSnapshot(world, tripId);
        await gate;

        return 'forward';
      } finally {
        state.finished++;
      }
    },
    failed(error) {
      state.errors.push(error);
    },
  };
  controls.add(control);
  world.tripManagement.cleanups.add(async () => {
    state.release();
    try {
      await expect.poll(() => state.finished).toBe(state.exchanges.length);
    } finally {
      controls.delete(control);
    }
    expect(state.errors.map(String)).toEqual([]);
  });
  expect(state.exchanges.length).toBe(0);
  world.set('loading:operation', state);
}
