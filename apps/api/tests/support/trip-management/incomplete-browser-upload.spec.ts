import { test, expect } from '@playwright/test';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { generateExactImage } from './generated-images.js';
import { installIncompleteUpload } from '../../../../web/tests/support/thumbnail/incomplete-upload.js';

test('incomplete multipart is rejected by the native parser and the original File remains reusable', async ({
  page,
}) => {
  const app = Fastify();
  await app.register(multipart);
  let accepted = 0,
    rejected = 0;
  const received: Buffer[] = [],
    errors: string[] = [];
  app.get('/', async (_request, reply) => reply.type('text/html').send('<input type="file">'));
  app.post('/upload', async (request, reply) => {
    try {
      const file = await request.file();
      const bytes = await file!.toBuffer();
      received.push(bytes);
      accepted++;

      return { bytes: bytes.length };
    } catch (error) {
      rejected++;
      errors.push(String(error));

      return reply.code(400).send({ incomplete: true });
    }
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
  const origin = `http://127.0.0.1:${address.port}`;
  const fault = await installIncompleteUpload(page, '/upload');
  try {
    await page.goto(origin);
    const input = await generateExactImage('PNG', 65536, 64, 48);
    await page
      .locator('input')
      .setInputFiles({ name: 'shrine.png', mimeType: 'image/png', buffer: input });
    const send = () =>
      page.evaluate(async () => {
        const data = new FormData();
        data.append('image', document.querySelector('input')!.files![0]!);
        const response = await fetch('/upload', {
          method: 'POST',
          headers: { 'x-operation-id': 'test-only-original-id' },
          body: data,
        });

        return { status: response.status, body: await response.json() };
      });
    expect(await send()).toEqual({ status: 400, body: { incomplete: true } });
    expect(fault.errors.map(String)).toEqual([]);
    expect(fault.attempts).toHaveLength(1);
    expect(fault.attempts[0]!.operationId).toBe('test-only-original-id');
    expect(fault.attempts[0]!.forwardedBytes).toBeLessThan(512);
    expect(accepted).toBe(0);
    expect(rejected).toBe(1);
    expect(errors[0]).toMatch(/unexpected end|multipart.*end/i);
    expect(received).toEqual([]);
    await fault.dispose();
    expect(await send()).toEqual({ status: 200, body: { bytes: input.length } });
    expect(received).toEqual([input]);
  } finally {
    await fault.dispose();
    await app.close();
  }
});
