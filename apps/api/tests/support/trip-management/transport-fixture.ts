import { observeThumbnailJobs } from './job-completion.js';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { RawUploadResult } from './raw-upload.js';
import { startRawUpload } from './raw-upload.js';
import {
  seedLifecycleBaseline,
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from './baseline.js';
import { selectExactImage } from './generated-images.js';
import type { UploadImage } from './generated-images.js';
import { imageMultipart } from './thumbnail-request.js';
import { holdNativeWebpOutput } from './native-image-gate.js';

export interface TransportFixture {
  condition: string;
  tripId: string;
  operationId: string;
  headers: Record<string, string>;
  body: Buffer;
  finish: boolean;
  gate?: ReturnType<typeof holdNativeWebpOutput>;
  completion?: ReturnType<typeof observeThumbnailJobs>;
  busy?: ReturnType<typeof startRawUpload>;
  busyOperationId?: string;
  outcome?: RawUploadResult;
}

export async function arrangeTransport(world: LedgerWorld, condition: string): Promise<void> {
  expect([
    '來源不可信',
    '沒有登入',
    '其他owner',
    '缺少圖片',
    '多餘文字欄位',
    '多餘part',
    '缺少版本header',
    '截斷傳輸',
    '請求總量超限',
    '上傳逾時',
    '處理逾時',
    '圖片工作忙碌',
  ]).toContain(condition);
  await seedLifecycleBaseline(world, '一般可用');
  await selectExactImage(
    world,
    'JPEG .jpg',
    condition === '請求總量超限' ? 10485760 : 65536,
    64,
    48,
  );
  const files = world.get<UploadImage[]>('management:uploadFiles');
  const before = await managementSnapshot(world);
  const row = before.trips[0]!;
  const tripId = managementTripId(world);
  const operationId = randomUUID();
  const boundary = `ledger-${randomUUID()}`;
  const closing = Buffer.from(`--${boundary}--\r\n`);
  const fixture: TransportFixture = {
    condition,
    tripId,
    operationId,
    finish: condition !== '上傳逾時',
    headers: {
      cookie: world.users.get('Alice')!.cookie,
      origin: world.get<string>('webOrigin'),
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'X-Operation-Id': operationId,
      'X-Expected-Lifecycle-Revision': String(row.lifecycle_revision),
      'X-Expected-Thumbnail-Revision': String(row.thumbnail_revision),
    },
    body: imageMultipart(files, boundary),
  };
  switch (condition) {
    case '來源不可信':
      fixture.headers.origin = 'https://untrusted.invalid';
      break;
    case '沒有登入':
      delete fixture.headers.cookie;
      break;
    case '其他owner':
      fixture.headers.cookie = world.users.get('Carol')!.cookie;
      break;
    case '缺少圖片':
      fixture.body = closing;
      break;
    case '多餘文字欄位':
      fixture.body = Buffer.concat([
        fixture.body.subarray(0, -closing.length),
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\nextra\r\n`,
        ),
        closing,
      ]);
      break;
    case '多餘part':
      fixture.body = imageMultipart([files[0]!, files[0]!], boundary);
      break;
    case '缺少版本header':
      delete fixture.headers['X-Expected-Thumbnail-Revision'];
      break;
    case '截斷傳輸':
      fixture.body = fixture.body.subarray(0, -closing.length - 32);
      break;
    case '上傳逾時':
      fixture.body = fixture.body.subarray(0, -closing.length - 32);
      break;
    case '請求總量超限':
      // A legal multipart preamble consumes framing budget without enlarging the valid file.
      fixture.body = Buffer.concat([
        Buffer.alloc(10551297 - fixture.body.length - 2, 32),
        Buffer.from('\r\n'),
        fixture.body,
      ]);
      expect(fixture.body.length).toBe(10551297);
      break;
  }
  if (condition === '處理逾時' || condition === '圖片工作忙碌') {
    const gate = holdNativeWebpOutput();
    fixture.gate = gate;
    world.tripManagement.cleanups.add(async () => {
      gate.restore();
    });
    if (condition === '處理逾時')
      fixture.completion = observeThumbnailJobs(world, tripId, [operationId]);
    if (condition === '圖片工作忙碌') {
      fixture.busyOperationId = randomUUID();
      fixture.completion = observeThumbnailJobs(world, tripId, [fixture.busyOperationId]);
      const busy = startRawUpload(
        new URL(`/api/trips/${tripId}/thumbnail`, world.origin),
        {
          ...fixture.headers,
          'X-Operation-Id': fixture.busyOperationId,
        },
        fixture.body,
      );
      fixture.busy = busy;
      world.tripManagement.cleanups.add(async () => {
        await busy.dispose();
      });
      await gate.waitUntilReached();
      expect(await managementSnapshot(world)).toEqual(before);
    }
  }
  world.set('management:transport', fixture);
  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
}
