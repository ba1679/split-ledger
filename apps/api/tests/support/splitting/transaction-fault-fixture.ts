import { expect } from '@playwright/test';
import type { SplittingHooks } from '../../../src/modules/splitting/dependencies.js';
import type { LedgerWorld } from '../world.js';
import type { SplittingWorldState } from './types.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

/** Worker-local dispatch keeps internal fault injection isolated to the scenario's trip. */
export function createScenarioSplittingHooks(
  worlds: Iterable<{ splitting: SplittingWorldState }>,
): SplittingHooks {
  const hooks: SplittingHooks = {};
  const names = [
    'beforeTripLock',
    'afterTripLock',
    'afterSettlementInsert',
    'afterRepaymentInsert',
    'afterFirstAdjustmentInsert',
  ] as const;
  for (const name of names) {
    hooks[name] = async (context) => {
      for (const world of worlds) {
        if ([...world.splitting.ids.trips.values()].includes(context.tripId)) {
          await world.splitting.hooks?.[name]?.(context);
        }
      }
    };
  }

  return hooks;
}

export async function armPartialAdjustmentFailure(world: LedgerWorld): Promise<void> {
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world);
  expect(before.settlements.some((row) => row.id === pending.id)).toBe(false);
  expect(before.repayments.some((row) => row.id === pending.repaymentId)).toBe(false);
  const input = structuredClone(pending);
  world.set('splitting:faultInput', input);
  world.set('splitting:before', before);
  world.set('splitting:sourceSnapshot', before);
  world.set('splitting:faultReached', false);
  world.splitting.snapshot = before;
  world.splitting.hooks = {
    ...world.splitting.hooks,
    afterFirstAdjustmentInsert: async (context) => {
      expect(context.tripId).toBe(tripId);
      expect(context.ownerId).toBe(world.get<string>('splitting:ownerId'));
      expect(context.commandId).toBe(input.id);
      world.set('splitting:faultReached', true);
      throw new Error('Isolated settlement failure after the first adjustment insert');
    },
  };
  expect(await snapshotSplittingSources(world)).toEqual(before);
  expect(world.get('splitting:settlementSnapshot')).toEqual(input);
}
