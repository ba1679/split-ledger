import { Then, expect } from '../../../support/fixtures.js';
import { managementSnapshot } from '../../../support/trip-management/baseline.js';
import {
  lifecycleCommands,
  type RecordedTripCommand,
} from '../../../support/trip-management/commands.js';
import { assertLifecycleTransition } from '../../../support/trip-management/lifecycle-result.js';
import {
  assertPreservedTrip,
  assertOtherDataUnchanged,
} from '../../../support/trip-management/preservation.js';
import { assertPurgedTrip } from '../../../support/trip-management/purge-result.js';

Then('本次 {string} 完整成功而沒有重複資料', async ({ world }, operation: string) => {
  expect(Object.keys(lifecycleCommands)).toContain(operation);
  expect(world.get('management:previousFailedOperation')).toBe(operation);
  const command = world.get<RecordedTripCommand>('management:lastCommand');
  const previousId = world.get<string>('management:previousFailedOperationId');

  expect(command.operationId).not.toBe(previousId);
  expect(command.kind).toBe(lifecycleCommands[operation as keyof typeof lifecycleCommands].kind);
  if (operation === '永久刪除') await assertPurgedTrip(world);
  else {
    await assertLifecycleTransition(world, operation === '復原' ? 'active' : 'trash');
    await assertPreservedTrip(world);
  }
  await assertOtherDataUnchanged(world);
  const after = await managementSnapshot(world);

  expect(after.receipts.some((row) => row.operation_id === previousId)).toBe(false);
  expect(after.receipts.filter((row) => row.operation_id === command.operationId)).toHaveLength(1);
});
