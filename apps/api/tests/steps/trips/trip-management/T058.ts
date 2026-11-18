import { ownerRead } from '../../../support/trip-management/preservation.js';
import { Given, expect } from '../../../support/fixtures.js';
import {
  seedLifecycleBaseline,
  managementSnapshot,
} from '../../../support/trip-management/baseline.js';

Given('一般旅行的不可變歷史與owner成員已存在', async ({ world }) => {
  await seedLifecycleBaseline(world, '一般可用');
  const before = await managementSnapshot(world);

  expect(before.members.filter((row) => row.role === 'owner')).toHaveLength(1);
  expect(before.repayments).toHaveLength(2);
  expect(before.settlements).toHaveLength(1);
  expect(before.adjustments).toHaveLength(2);
  expect(before.trips[0]!.deleted_at).toBeNull();
  const tripId = String(before.trips[0]!.id);
  const paths = [
    `/api/trips/${tripId}/members`,
    ...before.repayments.map((row) => `/api/trips/${tripId}/repayments/${String(row.id)}`),
    ...before.settlements.map((row) => `/api/trips/${tripId}/settlements/${String(row.id)}`),
    `/api/trips/${tripId}/settlement`,
  ];
  const reads: Record<string, unknown> = {};
  for (const path of paths) {
    const response = await ownerRead(world, path);
    expect(response.status()).toBe(200);
    reads[path] = await response.json();
  }
  world.set('management:historyReads', reads);
  world.set('management:before', before);
});
