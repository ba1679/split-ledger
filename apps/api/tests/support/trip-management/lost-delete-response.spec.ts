import { test, expect } from '@playwright/test';
import Fastify from 'fastify';
import { installLostDeleteResponse } from '../../../../web/tests/support/expenses/lost-delete-response.js';

test('bodyless DELETE really completes once with204 and cookie before its browser delivery is lost', async ({
  page,
}) => {
  const app = Fastify();
  let deleted = 0,
    browserDeletes = 0,
    cookiePresent = false;
  app.get('/', async (_request, reply) =>
    reply.type('text/html').send('<p>Native delete probe</p>'),
  );
  app.delete('/resource', async (request, reply) => {
    deleted++;
    cookiePresent = request.headers.cookie?.includes('native_delete_session=') ?? false;

    return reply.code(204).send();
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
  const origin = `http://127.0.0.1:${address.port}`;
  const fault = await installLostDeleteResponse(page, '/resource', async (response) => {
    expect(response.status()).toBe(204);
    expect((await response.body()).length).toBe(0);
    expect(deleted).toBe(1);
  });
  page.on('request', (request) => {
    if (request.method() === 'DELETE') browserDeletes++;
  });
  try {
    await page
      .context()
      .addCookies([
        { name: 'native_delete_session', value: 'test-only-value', url: origin, httpOnly: true },
      ]);
    await page.goto(origin);
    const lost = await page.evaluate(async () => {
      try {
        await fetch('/resource', { method: 'DELETE' });

        return false;
      } catch {
        return true;
      }
    });
    expect(lost).toBe(true);
    expect(fault.errors.map(String)).toEqual([]);
    expect(fault.calls).toBe(1);
    expect(browserDeletes).toBe(1);
    expect(deleted).toBe(1);
    expect(cookiePresent).toBe(true);
    await expect.poll(() => fault.done).toBe(true);
  } finally {
    await fault.dispose();
    await app.close();
  }
});
