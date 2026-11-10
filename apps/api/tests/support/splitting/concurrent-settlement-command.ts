import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { SplittingTransactionContext } from '../../../src/modules/splitting/dependencies.js';
import { seedSession } from '../seed.js';
import type { LedgerWorld } from '../world.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { amySettlementRequest } from './settle-amy-command.js';

export const concurrentSettlementPhrase = '兩個裝置同時結清 Amy 向 Alice 的同一安排';

/** Both commands reach the pre-lock boundary before either may acquire the trip lock. */
export function settlementRaceBarrier(commandIds: readonly string[], timeoutMs = 5000) {
  const arrived = new Set<string>();
  let release!: () => void;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reject!: (error: Error) => void;
  const ready = new Promise<void>((resolve, fail) => {
    release = resolve;
    reject = fail;
  });

  return {
    arrived,
    async enter(context: SplittingTransactionContext) {
      expect(commandIds).toContain(context.commandId);
      expect(arrived.has(context.commandId), 'Each command enters the barrier once').toBe(false);
      arrived.add(context.commandId);
      if (arrived.size === commandIds.length) {
        clearTimeout(timer);
        release();
      } else {
        timer = setTimeout(
          () => reject(new Error('Both settlement commands must reach the pre-lock barrier')),
          timeoutMs,
        );
      }
      await ready;
    },
    dispose() {
      clearTimeout(timer);
      release();
    },
  };
}

export async function requestConcurrentSettlements(world: LedgerWorld): Promise<void> {
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const tripId = splittingTripId(world);
  const sessions = await Promise.all([seedSession(world), seedSession(world)]);
  expect(sessions[0]!.id).toBe(sessions[1]!.id);
  expect(sessions[0]!.cookie).not.toBe(sessions[1]!.cookie);
  const commands = ['33', '34'].map((amount) =>
    amySettlementRequest({ ...pending, id: randomUUID(), repaymentId: randomUUID() }, amount),
  );
  const before = await snapshotSplittingSources(world);
  const barrier = settlementRaceBarrier(commands.map((command) => command.id));
  const previousHooks = world.splitting.hooks;
  world.splitting.snapshot = before;
  world.set('splitting:before', before);
  world.set('splitting:concurrentCommands', commands);
  commands.forEach((command, index) => {
    world.splitting.ids.settlements.set(`concurrent:${index}`, command.id);
    world.splitting.ids.repayments.set(`concurrent:${index}`, command.repaymentId);
  });
  world.splitting.hooks = {
    ...previousHooks,
    beforeTripLock: async (context) => {
      expect(context.tripId).toBe(tripId);
      expect(context.ownerId).toBe(sessions[0]!.id);
      await previousHooks?.beforeTripLock?.(context);
      await barrier.enter(context);
    },
  };
  try {
    const responses = await Promise.all(
      commands.map((data, index) =>
        world.api.post(`/api/trips/${tripId}/settlements`, {
          headers: { Cookie: sessions[index]!.cookie, Origin: world.get<string>('webOrigin') },
          data,
        }),
      ),
    );
    world.set('splitting:concurrentResponses', responses);
    world.set(
      'splitting:concurrentReplies',
      await Promise.all(responses.map((response) => response.json())),
    );
    world.set('splitting:after', await snapshotSplittingSources(world));
    world.set('splitting:concurrentBarrierArrivals', [...barrier.arrived]);
    expect(
      [...barrier.arrived].sort(),
      'Product commands must compete at the internal trip-lock boundary',
    ).toEqual(commands.map((command) => command.id).sort());
  } finally {
    barrier.dispose();
    world.splitting.hooks = previousHooks;
  }
}
