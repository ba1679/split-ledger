import { Given, expect } from '../../../support/fixtures.js';
import {
  managementTripId,
  managementSnapshot,
} from '../../../../../api/tests/support/trip-management/baseline.js';
import { installOwnedWriteRejection } from '../../../../../api/tests/support/trip-management/write-rejection.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

Given('本次旅行 {string} 將明確失敗', async ({ world }, operation: string) => {
  expect(['移至垃圾桶', '復原', '永久刪除']).toContain(operation);
  const ui = managementUI(world);
  expect(ui.state).toBe(
    operation === '移至垃圾桶' ? '移入確認' : operation === '復原' ? '垃圾桶' : '永久刪除確認',
  );
  const fault = await installOwnedWriteRejection(
    world,
    'trips',
    world.users.get('Alice')!.id,
    managementTripId(world),
  );
  expect(await fault.attempts()).toBe(0);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
  expect(ui.writes.length).toBe(0);
  world.set('management:lifecycleFault', { operation, fault });
});
