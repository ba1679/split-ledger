import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures.js';
import { arrangeTransport, type TransportFixture } from './transport-fixture.js';
import { managementSnapshot } from './baseline.js';
import { startRawUpload } from './raw-upload.js';
import { imageMultipart } from './thumbnail-request.js';
import type { UploadImage } from './generated-images.js';

for (const variant of [
  'chunked-total',
  'framing',
  'text-first',
  'text-second',
  'text-incomplete',
  'three-files',
] as const) {
  test(`multipart admission rejects ${variant} without changing authoritative data`, async ({
    world,
  }) => {
    await arrangeTransport(world, '缺少版本header');
    const fixture = world.get<TransportFixture>('management:transport');
    const before = await managementSnapshot(world);
    const boundary = fixture.headers['content-type']!.split('boundary=')[1]!;
    const files = world.get<UploadImage[]>('management:uploadFiles');
    let body = imageMultipart(files, boundary);
    const headers: Record<string, string> = {
      ...fixture.headers,
      'X-Expected-Thumbnail-Revision': String(before.trips[0]!.thumbnail_revision),
    };
    const text = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\nextra\r\n`,
    );
    if (variant === 'chunked-total') {
      headers['transfer-encoding'] = 'chunked';
      body = Buffer.concat([
        Buffer.alloc(10551297 - body.length - 2, 32),
        Buffer.from('\r\n'),
        body,
      ]);
      expect(body.length).toBe(10551297);
    } else if (variant === 'framing') {
      body = Buffer.concat([Buffer.alloc(65537, 32), Buffer.from('\r\n'), body]);
    } else if (variant === 'text-incomplete') {
      body = text;
    } else if (variant === 'text-first') {
      body = Buffer.concat([text, body]);
    } else if (variant === 'text-second') {
      const closing = Buffer.from(`--${boundary}--\r\n`);
      body = Buffer.concat([body.subarray(0, -closing.length), text, closing]);
    } else {
      body = imageMultipart([files[0]!, files[0]!, files[0]!], boundary);
    }
    const upload = startRawUpload(
      new URL(`/api/trips/${fixture.tripId}/thumbnail`, world.origin),
      headers,
      body,
      variant !== 'text-incomplete',
    );
    try {
      const outcome = await upload.result;
      expect(outcome.kind, 'The rejection must flush before the socket is closed').toBe('http');
      if (outcome.kind !== 'http') throw outcome.error;
      expect(outcome.status).toBe(variant.startsWith('text-') ? 400 : 413);
      expect(JSON.parse(outcome.body.toString())).toMatchObject({
        code: variant.startsWith('text-') ? 'VALIDATION_ERROR' : 'IMAGE_TOO_LARGE',
      });
      expect(await managementSnapshot(world)).toEqual(before);
    } finally {
      await upload.dispose();
    }
  });
}

test('decoder deadline keeps the slot until actual native completion, then admits a new job', async ({
  world,
}) => {
  await arrangeTransport(world, '處理逾時');
  const fixture = world.get<TransportFixture>('management:transport');
  const before = await managementSnapshot(world);
  const url = new URL(`/api/trips/${fixture.tripId}/thumbnail`, world.origin);
  const first = startRawUpload(url, fixture.headers, fixture.body);
  try {
    await fixture.gate!.waitUntilReached();
    const timeout = await first.result;
    expect(timeout.kind).toBe('http');
    if (timeout.kind !== 'http') throw timeout.error;
    expect(timeout.status).toBe(408);
    fixture.completion!.assertPending();
    const second = startRawUpload(
      url,
      { ...fixture.headers, 'X-Operation-Id': randomUUID() },
      fixture.body,
    );
    try {
      const busy = await second.result;
      expect(busy.kind).toBe('http');
      if (busy.kind !== 'http') throw busy.error;
      expect(busy.status).toBe(503);
      expect(JSON.parse(busy.body.toString())).toMatchObject({ code: 'UPLOAD_BUSY' });
    } finally {
      await second.dispose();
    }
    expect(await managementSnapshot(world)).toEqual(before);
    fixture.gate!.restore();
    await fixture.completion!.waitForFinished();
    expect(await managementSnapshot(world)).toEqual(before);
    const third = startRawUpload(
      url,
      { ...fixture.headers, 'X-Operation-Id': randomUUID() },
      fixture.body,
    );
    try {
      const success = await third.result;
      expect(success.kind).toBe('http');
      if (success.kind !== 'http') throw success.error;
      expect(success.status).toBe(200);
    } finally {
      await third.dispose();
    }
  } finally {
    fixture.gate!.restore();
    await first.dispose();
  }
});
