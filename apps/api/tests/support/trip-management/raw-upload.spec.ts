import { createServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test, expect } from '@playwright/test';
import { startRawUpload } from './raw-upload.js';

test('raw upload preserves real chunked body, held stream, HTTP and client abort', async () => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(req.url!);
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      res.writeHead(201, { 'content-type': 'application/octet-stream' });
      res.end(Buffer.concat(chunks));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const body = Buffer.from([0, 255, 1, 23]);
  const held = startRawUpload(new URL('/held', origin), {}, body, false);
  const aborted = startRawUpload(new URL('/abort', origin), {}, body, false);
  try {
    await expect.poll(() => requests.length).toBe(2);
    let finished = false;
    void held.result.then(() => {
      finished = true;
    });
    expect(finished).toBe(false);
    held.end();
    const result = await held.result;
    expect(result.kind).toBe('http');
    if (result.kind !== 'http') throw Error('Expected real HTTP result');
    expect(result.status).toBe(201);
    expect(result.body).toEqual(body);
    aborted.abort();
    expect((await aborted.result).kind).toBe('closed');
  } finally {
    await held.dispose();
    await aborted.dispose();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
