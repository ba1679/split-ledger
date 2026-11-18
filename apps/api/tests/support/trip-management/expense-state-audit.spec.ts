import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import Fastify from 'fastify';
import {
  installExpenseStateAudit,
  expenseStateAudit,
  restoreExpenseStateAudit,
} from '../../../../web/tests/support/expenses/state-read-audit.js';

test('state audit waits for real JSON and does not retain active after trash or purge', async ({
  page,
}) => {
  const app = Fastify(),
    cookies: boolean[] = [];
  let current = 'active';
  const cookie = (headers: { cookie?: string }) =>
    cookies.push(headers.cookie?.includes('state_audit_session=') ?? false);
  app.get('/', async (_request, reply) =>
    reply.type('text/html').send('<p>Native state audit</p>'),
  );
  app.post<{ Body: { state: string } }>('/status', async (request) => {
    cookie(request.headers);
    current = request.body.state;

    return { state: current };
  });
  app.get('/api/trips/:id/state', async (request) => {
    cookie(request.headers);

    return { state: current };
  });
  app.get('/api/trips/:id/expenses/:expense', async (request, reply) => {
    cookie(request.headers);

    return reply.code(404).send({ code: 'NOT_FOUND', message: 'Unit resource absent' });
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page
      .context()
      .addCookies([
        { name: 'state_audit_session', value: 'test-only-value', url: origin, httpOnly: true },
      ]);
    await page.goto(origin);
    await installExpenseStateAudit(page);
    const ids = { trip: randomUUID(), expense: randomUUID() };
    await page.evaluate(async (ids) => {
      const state = await fetch(`/api/trips/${ids.trip}/state`);
      await (await fetch(`/api/trips/${ids.trip}/expenses/${ids.expense}`)).json();
      await state.json();
      await (await fetch(`/api/trips/${ids.trip}/expenses/${ids.expense}`)).json();
      for (const value of ['trash', 'purged']) {
        await (
          await fetch('/status', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ state: value }),
          })
        ).json();
        const unread = await fetch(`/api/trips/${ids.trip}/state`);
        await (await fetch(`/api/trips/${ids.trip}/expenses/${ids.expense}`)).json();
        await unread.json();
        await (await fetch(`/api/trips/${ids.trip}/expenses/${ids.expense}`)).json();
      }
    }, ids);
    const events = await expenseStateAudit(page);
    expect(
      events.filter((event) => event.kind === 'expense-start').map((event) => event.state),
    ).toEqual(['unconfirmed', 'active', 'unconfirmed', 'trash', 'unconfirmed', 'purged']);
    expect(
      events.filter((event) => event.kind === 'state-complete').map((event) => event.state),
    ).toEqual(['active', 'trash', 'purged']);
    expect(events.every((event) => event.tripId === ids.trip)).toBe(true);
    expect(cookies).toHaveLength(11);
    expect(cookies.every(Boolean)).toBe(true);
    await restoreExpenseStateAudit(page);
    expect(await expenseStateAudit(page)).toEqual([]);
  } finally {
    await restoreExpenseStateAudit(page);
    await app.close();
  }
});
