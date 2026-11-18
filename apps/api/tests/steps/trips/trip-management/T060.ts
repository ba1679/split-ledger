import { Then, expect } from '../../../support/fixtures.js';
import type { HistoryAttempt } from './T059.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';

Then('一般歷史保護仍拒絕且資料完全不變', async ({ world }) => {
  const attempt = world.get<HistoryAttempt>('management:historyAttempt');

  expect(attempt.rowCount).toBeNull();
  expect(attempt.error).toBeDefined();
  expect(attempt.error!.code).toBe('23514');
  expect(attempt.error!.message).toMatch(/immutable/i);
  expect(attempt.error!.where).toContain(
    attempt.operation === '刪除owner成員' ? 'app_protect_owner' : 'app_immutable_payment',
  );
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  const reads = world.get<Record<string, unknown>>('management:historyReads');
  for (const [path, body] of Object.entries(reads)) {
    const response = await ownerRead(world, path);

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual(body);
  }
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
});
