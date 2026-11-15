import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import {
  executeOwnerTripCommand,
  lifecycleCommands,
  type RecordedTripCommand,
} from './commands.js';
import { armCommandFailure, type CommandFault } from './transaction-fault.js';
import { assertCommandRollback } from './rollback-result.js';

export async function arrangeFailedCommandThenRelease(
  world: LedgerWorld,
  operation: string,
): Promise<void> {
  expect(Object.keys(lifecycleCommands)).toContain(operation);
  await armCommandFailure(world, operation);
  const fault = world.get<CommandFault>('management:fault');

  try {
    // Arrange a real previous failure; the new retry is reserved for the scenario's single When.
    await executeOwnerTripCommand(world, operation);
    await assertCommandRollback(world);
    const previous = world.get<RecordedTripCommand>('management:lastCommand');

    world.set('management:previousFailedOperationId', previous.operationId);
    world.set('management:previousFailedOperation', operation);
  } finally {
    await fault.dispose();
  }
  const afterFailure = await managementSnapshot(world);

  expect(
    afterFailure.receipts.some(
      (row) => row.operation_id === world.get('management:previousFailedOperationId'),
    ),
  ).toBe(false);
  world.tripManagement.snapshot = afterFailure;
  world.set('management:before', afterFailure);
  world.set('management:sharedBefore', await sharedSnapshot(world));
}
