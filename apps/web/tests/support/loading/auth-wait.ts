import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  seedLifecycleBaseline,
  managementSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { login } from '../browser.js';
import { observeManagement, managementUI } from '../trips/management-fixture.js';
import {
  connectedQueryExchanges,
  liveQueryAttempts,
  queryAttempts,
  isCancelledRead,
} from './query-attempts.js';
import {
  responseProxyControls,
  type ResponseProxyControl,
  type ProxyExchange,
} from './response-proxy.js';

export interface AuthWait {
  authority: { id: string; name: string };
  before: TripManagementSnapshot;
  arrived: number;
  exchanges: ProxyExchange[];
  finished: number;
  errors: unknown[];
  release(): void;
}

export async function arrangeAuthWait(page: Page, world: LedgerWorld): Promise<void> {
  await seedLifecycleBaseline(world, '一般可用');
  await login(page, world, 'Alice');
  await page.goto('about:blank');
  const response = await ownerRead(world, '/api/me');
  expect(response.status()).toBe(200);
  const authority = await response.json();
  expect(authority).toMatchObject({ id: world.users.get('Alice')!.id, name: 'Alice' });
  observeManagement(page, world, 'auth-wait');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state: AuthWait = {
    authority,
    before: await managementSnapshot(world),
    arrived: 0,
    exchanges: [],
    finished: 0,
    errors: [],
    release,
  };
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const control: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'GET' &&
      new URL(request.url!, 'http://test.invalid').pathname === '/api/me',
    async handle(exchange) {
      state.arrived++;
      state.exchanges.push(exchange);
      try {
        expect(exchange.status).toBe(200);
        expect(JSON.parse(exchange.body.toString())).toEqual(authority);
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
    release();
    try {
      await expect.poll(() => state.finished).toBe(state.arrived);
    } finally {
      controls.delete(control);
    }
    expect(state.errors.map(String)).toEqual([]);
  });
  world.set('loading:auth', state);
}

export async function awaitAuthReadHeld(world: LedgerWorld): Promise<void> {
  const state = world.get<AuthWait>('loading:auth'),
    ui = managementUI(world);
  await expect.poll(() => connectedQueryExchanges(state.exchanges).length).toBe(1);
  await expect.poll(() => liveQueryAttempts(ui, '/api/me').length).toBe(1);
  expect(queryAttempts(ui, '/api/me').filter(isCancelledRead).length).toBeLessThanOrEqual(1);
  expect(state.finished).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
}
