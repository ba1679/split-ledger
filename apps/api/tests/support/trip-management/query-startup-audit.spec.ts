import type { Request } from '@playwright/test';
import { test, expect } from '../../../../web/tests/support/fixtures.js';
import { seedTrip } from '../seed.js';
import { login } from '../../../../web/tests/support/browser.js';
import {
  isCancelledRead,
  queryAttempts,
  liveQueryAttempts,
  connectedQueryExchanges,
} from '../../../../web/tests/support/loading/query-attempts.js';
import {
  responseProxyControls,
  type ProxyExchange,
  type ResponseProxyControl,
} from '../../../../web/tests/support/loading/response-proxy.js';

test('native cancelled startup GET stays recorded; the live query is genuinely held and ordinary wire failure is never hidden', async ({
  page,
  world,
}) => {
  await seedTrip(world, '原生查詢觀測');
  await login(page, world);
  const reads: Request[] = [],
    exchanges: ProxyExchange[] = [],
    errors: unknown[] = [];
  let release!: () => void,
    finished = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const controls = responseProxyControls(world.get<string>('webOrigin'));
  const control: ResponseProxyControl = {
    matches: (request) =>
      request.method === 'GET' &&
      new URL(request.url!, 'http://test.invalid').pathname === '/api/trips',
    async handle(exchange) {
      exchanges.push(exchange);
      try {
        expect(exchange.status).toBe(200);
        await gate;

        return 'forward';
      } finally {
        finished++;
      }
    },
    failed(error) {
      errors.push(error);
    },
  };
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname.startsWith('/api/'))
      reads.push(request);
  });
  controls.add(control);
  try {
    await page.goto('/trips', { waitUntil: 'domcontentloaded' });
    await expect
      .poll(() => queryAttempts({ reads }, '/api/trips').filter(isCancelledRead).length)
      .toBe(1);
    await expect.poll(() => connectedQueryExchanges(exchanges).length).toBe(1);
    expect(liveQueryAttempts({ reads }, '/api/trips').length).toBe(1);
    expect(finished).toBe(0);
    await expect(page.getByRole('heading', { name: '原生查詢觀測', exact: true })).toHaveCount(0);
    release();
    await expect(page.getByRole('heading', { name: '原生查詢觀測', exact: true })).toBeVisible();
    for (const query of ['/api/me', '/api/trips']) {
      const all = queryAttempts({ reads }, query),
        live = liveQueryAttempts({ reads }, query);
      expect(all.length).toBe(2);
      expect(all.filter(isCancelledRead).length).toBe(1);
      expect(live.length).toBe(1);
      expect((await live[0]!.response())?.status()).toBe(200);
    }
    const failurePath = '/api/query-startup-hard-failure';
    await page.route(`**${failurePath}`, (route) => route.abort('failed'));
    const failed = page.waitForEvent(
      'requestfailed',
      (request) => new URL(request.url()).pathname === failurePath,
    );
    expect(
      await page.evaluate(async (path) => {
        try {
          await fetch(path);

          return 'unexpected-success';
        } catch {
          return 'transport-failed';
        }
      }, failurePath),
    ).toBe('transport-failed');
    const request = await failed;
    expect(
      isCancelledRead(request),
      `Ordinary failure (${request.failure()?.errorText}) must remain observable`,
    ).toBe(false);
    expect(liveQueryAttempts({ reads }, failurePath).length).toBe(1);
  } finally {
    release();
    try {
      await expect.poll(() => finished).toBe(exchanges.length);
    } finally {
      controls.delete(control);
    }
    expect(errors.map(String)).toEqual([]);
  }
});

test('uncached SPA option query keeps every native attempt and its successful live read', async ({
  page,
  world,
}) => {
  await seedTrip(world, 'SPA新查詢');
  await login(page, world);
  await page.goto('/trips');
  const card = page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: 'SPA新查詢', exact: true }) });
  await card.click();
  await expect(page.getByRole('link', { name: '記一筆', exact: true })).toBeVisible();
  const reads: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/currencies')
      reads.push(request);
  });
  await page.getByRole('link', { name: '記一筆', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toBeEnabled();
  await expect
    .poll(async () => {
      const live = liveQueryAttempts({ reads }, '/api/currencies');
      if (live.length !== 1) return false;

      return (await live[0]!.response())?.status() === 200;
    })
    .toBe(true);
  const live = liveQueryAttempts({ reads }, '/api/currencies');
  expect(live.length).toBe(1);
  expect(await (await live[0]!.response())!.finished()).toBeNull();
  expect(reads.filter(isCancelledRead).length).toBeLessThanOrEqual(1);
  expect(reads.length).toBe(live.length + reads.filter(isCancelledRead).length);
  console.info(
    JSON.stringify({
      audit: 'uncached-SPA-option-query',
      attempts: reads.length,
      cancelled: reads.filter(isCancelledRead).length,
      live: live.length,
    }),
  );
  for (const request of reads)
    if (!isCancelledRead(request)) expect((await request.response())?.status()).toBe(200);
});
