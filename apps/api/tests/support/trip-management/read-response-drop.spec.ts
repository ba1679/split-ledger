import { isCancelledRead } from '../../../../web/tests/support/loading/query-attempts.js';
import { test, expect } from '../../../../web/tests/support/fixtures.js';
import { seedTrip } from '../seed.js';
import { login } from '../../../../web/tests/support/browser.js';
import {
  responseProxyControls,
  type ResponseProxyControl,
} from '../../../../web/tests/support/loading/response-proxy.js';

test('native GET truncation rejects the genuine JSON response without transparent browser retry or a write', async ({
  page,
  world,
}) => {
  await seedTrip(world, '真實讀取中斷');
  await login(page, world);
  await page.goto('/trips');
  await expect(page.getByRole('heading', { name: '真實讀取中斷', exact: true })).toBeVisible();
  const controls = responseProxyControls(world.get<string>('webOrigin')),
    errors: unknown[] = [];
  let captured: import('@playwright/test').Request | undefined;
  let calls = 0,
    nativeReads = 0,
    writes = 0;
  const onRequest = (request: import('@playwright/test').Request) => {
    if (new URL(request.url()).pathname !== '/api/trips') return;
    if (request.method() === 'GET') {
      nativeReads++;
      captured = request;
    } else writes++;
  };
  const control: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'GET' &&
      new URL(request.url!, 'http://test.invalid').pathname === '/api/trips',
    async handle(exchange) {
      calls++;
      expect(exchange.status).toBe(200);
      expect(JSON.parse(exchange.body.toString()).items[0].name).toBe('真實讀取中斷');

      return 'drop';
    },
    failed(error) {
      errors.push(error);
    },
  };
  page.on('request', onRequest);
  controls.add(control);
  try {
    const observed = await page.evaluate(async () => {
      let status: number | null = null;
      try {
        const response = await fetch('/api/trips');
        status = response.status;
        await response.json();

        return { status, rejected: false };
      } catch {
        return { status, rejected: true };
      }
    });
    expect(observed.rejected).toBe(true);
    expect([null, 200]).toContain(observed.status);
    expect(calls).toBe(1);
    expect(nativeReads).toBe(1);
    expect(captured).toBeDefined();
    expect(captured!.failure()).not.toBeNull();
    expect(
      isCancelledRead(captured!),
      'Truncated wire data is a real failed read, not a discarded startup cancellation',
    ).toBe(false);
    expect(writes).toBe(0);
    expect(errors.map(String)).toEqual([]);
    await expect(page.getByRole('heading', { name: '真實讀取中斷', exact: true })).toBeVisible();
  } finally {
    controls.delete(control);
    page.off('request', onRequest);
  }
});
