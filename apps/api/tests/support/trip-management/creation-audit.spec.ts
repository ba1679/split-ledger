import { randomUUID, createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { generateExactImage } from './generated-images.js';
import {
  installCreationAudit,
  creationAudit,
  restoreCreationAudit,
} from '../../../../web/tests/support/trips/creation-audit.js';

test('native audit distinguishes unread201 headers, completed JSON and state+Trip while preserving multipart/cookie', async ({
  page,
}) => {
  const app = Fastify();
  await app.register(multipart);
  const input = await generateExactImage('PNG', 65536, 64, 48);
  const received: { hash: string; cookie: boolean }[] = [];
  app.get('/', async (_request, reply) => reply.type('text/html').send('<input type="file">'));
  app.post('/api/trips', async (request, reply) => reply.code(201).send(request.body));
  app.get<{ Params: { id: string } }>('/api/trips/:id/state', async () => ({ state: 'active' }));
  app.get<{ Params: { id: string } }>('/api/trips/:id', async (request) => ({
    id: request.params.id,
    name: '京都賞楓',
  }));
  app.post('/api/trips/:id/thumbnail', async (request) => {
    const file = await request.file(),
      bytes = await file!.toBuffer();
    received.push({
      hash: createHash('sha256').update(bytes).digest('hex'),
      cookie: request.headers.cookie?.includes('native_audit_session=') ?? false,
    });

    return { bytes: bytes.length };
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page
      .context()
      .addCookies([
        { name: 'native_audit_session', value: 'test-only-value', url: origin, httpOnly: true },
      ]);
    await page.goto(origin);
    await page
      .locator('input')
      .setInputFiles({ name: 'shrine.png', mimeType: 'image/png', buffer: input });
    await installCreationAudit(page);
    const ids = [randomUUID(), randomUUID()];
    await page.evaluate(async (ids) => {
      const upload = async (id: string, operationId: string) => {
        const data = new FormData();
        data.append('image', document.querySelector('input')!.files![0]!);
        await (
          await fetch(`/api/trips/${id}/thumbnail`, {
            method: 'POST',
            headers: { 'x-operation-id': operationId },
            body: data,
          })
        ).json();
      };
      await upload(ids[0]!, 'unconfirmed');
      await (await fetch(`/api/trips/${ids[0]}/state`)).json();
      await (await fetch(`/api/trips/${ids[0]}`)).json();
      await upload(ids[0]!, 'lookup');
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: ids[1], name: '京都賞楓' }),
      });
      await upload(ids[1]!, 'headers-only');
      await response.json();
      await upload(ids[1]!, 'parsed-create');
    }, ids);
    expect(
      (await creationAudit(page))
        .filter((event) => event.kind === 'image-start')
        .map((event) => ({
          tripId: event.tripId,
          operationId: event.operationId,
          source: event.source,
        })),
    ).toEqual([
      { tripId: ids[0], operationId: 'unconfirmed', source: 'unconfirmed' },
      { tripId: ids[0], operationId: 'lookup', source: 'lookup' },
      { tripId: ids[1], operationId: 'headers-only', source: 'unconfirmed' },
      { tripId: ids[1], operationId: 'parsed-create', source: 'create' },
    ]);
    expect(received).toEqual(
      Array.from({ length: 4 }, () => ({
        hash: createHash('sha256').update(input).digest('hex'),
        cookie: true,
      })),
    );
    await restoreCreationAudit(page);
    expect(await creationAudit(page)).toEqual([]);
  } finally {
    await restoreCreationAudit(page);
    await app.close();
  }
});
