import { test, expect } from '@playwright/test';
import { createServer, request as nativeRequest } from 'node:http';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { generateExactImage } from './generated-images.js';
import {
  forwardProxyResponse,
  type ResponseProxyControl,
} from '../../../../web/tests/support/loading/response-proxy.js';

test('transparent response loss preserves original native multipart bytes/cookie without reposting', async ({
  page,
}) => {
  const input = await generateExactImage('PNG', 65536, 64, 48);
  const app = Fastify();
  await app.register(multipart, { limits: { files: 1, fields: 0, parts: 1, fileSize: 10485760 } });
  let accepted = 0;
  const received: Buffer[] = [];
  app.get('/', async (_request, reply) =>
    reply
      .type('text/html')
      .send(
        '<button onclick="document.querySelector(\'input\').click()">Pick</button><input type="file" hidden>',
      ),
  );
  app.post('/upload', async (request) => {
    const file = await request.file();
    expect(file!.fieldname).toBe('image');
    const bytes = await file!.toBuffer();
    received.push(bytes);
    accepted++;

    return {
      accepted,
      bytes: bytes.length,
      cookiePresent: request.headers.cookie?.includes('transport_test_session=') ?? false,
    };
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP echo server');
  const target = `http://127.0.0.1:${address.port}`;
  let dropped = 0,
    actual: unknown,
    failure: unknown;
  const controls = new Set<ResponseProxyControl>([
    {
      matches: (request) => request.method === 'POST' && request.url === '/upload',
      async handle(exchange) {
        expect(exchange.status).toBe(200);
        dropped++;
        actual = JSON.parse(exchange.body.toString());

        return 'drop';
      },
      failed(error) {
        failure = error;
      },
    },
  ]);
  const proxy = createServer((request, reply) => {
    const upstream = nativeRequest(
      new URL(request.url!, target),
      { method: request.method, headers: request.headers },
      (response) => forwardProxyResponse(response, request, reply, controls),
    );
    upstream.on('error', () => reply.destroy());
    request.once('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const proxyAddress = proxy.address();
  if (!proxyAddress || typeof proxyAddress === 'string') throw new Error('Expected TCP proxy');
  const origin = `http://127.0.0.1:${proxyAddress.port}`;
  try {
    await page
      .context()
      .addCookies([{ name: 'transport_test_session', value: 'test-only-native', url: origin }]);
    await page.goto(origin);
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Pick' }).click(),
    ]);
    await chooser.setFiles({ name: 'shrine.png', mimeType: 'image/png', buffer: input });
    const lost = await page.evaluate(async () => {
      const data = new FormData();
      data.append('image', document.querySelector('input')!.files![0]!);
      try {
        const response = await fetch('/upload', { method: 'POST', body: data });
        await response.json();

        return false;
      } catch {
        return true;
      }
    });
    expect(failure).toBeUndefined();
    expect(lost).toBe(true);
    expect(dropped).toBe(1);
    expect(accepted).toBe(1);
    expect(actual).toEqual({ accepted: 1, bytes: input.length, cookiePresent: true });
    expect(received).toEqual([input]);
  } finally {
    proxy.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      proxy.close((error) => (error ? reject(error) : resolve())),
    );
    await app.close();
  }
});
