import { Then, expect } from '../../../support/fixtures.js';
import type { TransportFixture } from '../../../support/trip-management/transport-fixture.js';
import type { RawUploadResult } from '../../../support/trip-management/raw-upload.js';
import type { TripManagementSnapshot } from '../../../support/trip-management/context.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';

function assertRejection(outcome: RawUploadResult, code: string, allowClosed: boolean) {
  const statuses: Record<string, number> = {
    REQUEST_ORIGIN_REJECTED: 403,
    UNAUTHENTICATED: 401,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    IMAGE_TOO_LARGE: 413,
    UPLOAD_INCOMPLETE: 400,
    UPLOAD_TIMEOUT: 408,
    UPLOAD_BUSY: 503,
  };

  expect(statuses[code]).toBeDefined();
  if (outcome.kind === 'closed') {
    expect(allowClosed, 'Only an incomplete/expired stream may have no HTTP response').toBe(true);
    // A fixture watchdog failure cannot stand in for the product deadline.
    expect((outcome.error as NodeJS.ErrnoException).code).toMatch(/^(ECONNRESET|EPIPE)$/);

    return;
  }
  expect(outcome.status).toBe(statuses[code]);
  expect(outcome.headers['content-type']).toContain('application/json');
  expect(JSON.parse(outcome.body.toString())).toMatchObject({ code, message: expect.any(String) });
  expect(JSON.parse(outcome.body.toString()).message.length).toBeGreaterThan(0);
}

Then('縮圖傳輸拒絕為 {string} 且沒有提交', async ({ world }, code: string) => {
  const fixture = world.get<TransportFixture>('management:transport');
  const before = world.get<TripManagementSnapshot>('management:before');

  expect(fixture.outcome).toBeDefined();
  assertRejection(
    fixture.outcome!,
    code,
    ['截斷傳輸', '上傳逾時', '處理逾時'].includes(fixture.condition),
  );
  if (fixture.busy) {
    // The genuine first job remains blocked until its own real decoder deadline.
    assertRejection(await fixture.busy.result, 'UPLOAD_TIMEOUT', true);
    await fixture.busy.dispose();
  }
  // An HTTP timeout is not evidence that its released native/DB work has settled.
  // This passive event must come from the real full-job finally, never the fixture.
  if (fixture.gate) {
    expect(fixture.completion).toBeDefined();
    fixture.completion!.assertPending();
    fixture.gate.restore();
    await fixture.completion!.waitForFinished();
  }
  const after = await managementSnapshot(world);

  expect(after).toEqual(before);
  expect(after.thumbnails).toHaveLength(1);
  expect(after.thumbnails[0]!.image_webp).toEqual(world.get('management:originalImage'));
  expect(
    after.receipts.some((row) =>
      [fixture.operationId, fixture.busyOperationId].includes(String(row.operation_id)),
    ),
  ).toBe(false);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
});
