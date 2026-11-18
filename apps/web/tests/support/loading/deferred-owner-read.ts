import { expect, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import { responseProxyControls, type ResponseProxyControl } from './response-proxy.js';

export interface DeferredOwnerRead {
  arrived: boolean;
  finished: boolean;
  error?: unknown;
  body?: Record<string, unknown>;
  request?: Request;
  release(): void;
}

/** Delay only a genuine upstream owner projection, retaining its real authenticated bytes. */
export function deferOwnerRead(world: LedgerWorld, tripId: string): DeferredOwnerRead {
  const { page } = managementUI(world);
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const path = `/api/trips/${tripId}`;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state: DeferredOwnerRead = { arrived: false, finished: false, release };
  const control: ResponseProxyControl = {
    matches: (request) =>
      !state.arrived &&
      request.method === 'GET' &&
      new URL(request.url!, 'http://test.invalid').pathname === path,
    async handle(exchange) {
      state.arrived = true;
      try {
        expect(exchange.status).toBe(200);
        state.body = JSON.parse(exchange.body.toString()) as Record<string, unknown>;
        expect(state.body).toMatchObject({ id: tripId, name: '日本旅行' });
        await gate;

        return 'forward';
      } finally {
        state.finished = true;
      }
    },
    failed(error) {
      state.error = error;
      state.finished = true;
    },
  };
  const onRequest = (request: Request) => {
    if (!state.request && request.method() === 'GET' && new URL(request.url()).pathname === path)
      state.request = request;
  };
  page.on('request', onRequest);
  controls.add(control);
  world.tripManagement.cleanups.add(async () => {
    release();
    try {
      if (state.arrived) await expect.poll(() => state.finished).toBe(true);
    } finally {
      controls.delete(control);
      page.off('request', onRequest);
    }
    expect(state.error).toBeUndefined();
  });

  return state;
}
