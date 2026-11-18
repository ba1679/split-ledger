import { expect, type Locator, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  seedLifecycleBaseline,
  managementSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { SESSION_COOKIE } from '../../../../api/tests/support/seed.js';
import { mockGoogle } from '../browser.js';
import { observeManagement } from '../trips/management-fixture.js';
import { responseProxyControls, type ResponseProxyControl } from './response-proxy.js';

export interface LoginWait {
  control: Locator;
  name: string;
  before: TripManagementSnapshot;
  requests: Request[];
  externalStarts: number;
  callbacks: number;
  arrived: number;
  finished: number;
  released: boolean;
  box?: { x: number; y: number; width: number; height: number };
  errors: unknown[];
  release(): void;
}

export async function arrangeLoginWait(page: Page, world: LedgerWorld): Promise<void> {
  await seedLifecycleBaseline(world, '一般可用');
  await page.context().clearCookies();
  await mockGoogle(page, world, 'Alice');
  const me = await page.context().request.get('/api/me');
  expect(me.status()).toBe(401);
  expect(
    (await page.context().cookies()).filter((cookie) => cookie.name === SESSION_COOKIE).length,
  ).toBe(0);
  observeManagement(page, world, 'login-wait');
  await page.goto('/');
  const control = page.getByRole('button', { name: '使用 Google 帳號登入', exact: true });
  await expect(control).toBeEnabled();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const state: LoginWait = {
    control,
    name: '使用 Google 帳號登入',
    before: await managementSnapshot(world),
    requests: [],
    externalStarts: 0,
    callbacks: 0,
    arrived: 0,
    finished: 0,
    released: false,
    errors: [],
    release() {
      state.released = true;
      release();
    },
  };
  const onRequest = (request: Request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/sign-in/social' && request.method() === 'POST')
      state.requests.push(request);
    if (url.hostname === 'accounts.google.com' && url.pathname === '/o/oauth2/v2/auth')
      state.externalStarts++;
    if (url.pathname === '/api/auth/callback/google' && request.method() === 'GET')
      state.callbacks++;
  };
  page.on('request', onRequest);
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const proxy: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'POST' &&
      new URL(request.url!, 'http://test.invalid').pathname === '/api/auth/sign-in/social',
    async handle(exchange) {
      state.arrived++;
      try {
        expect(exchange.status).toBe(200);
        const body = JSON.parse(exchange.body.toString()) as { url: string };
        expect(new URL(body.url).hostname).toBe('accounts.google.com');
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
  controls.add(proxy);
  world.tripManagement.cleanups.add(async () => {
    state.release();
    try {
      await expect.poll(() => state.finished).toBe(state.arrived);
    } finally {
      controls.delete(proxy);
      page.off('request', onRequest);
    }
    expect(state.errors.map(String)).toEqual([]);
  });
  world.set('loading:login', state);
}
