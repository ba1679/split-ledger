import { test as isolatedTest, expect } from '@playwright/test';
import { test } from '../fixtures.js';
import { LedgerWorld } from '../world.js';
import { captureCurrentAmyArrangement } from './current-arrangement-fixture.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import {
  armPartialAdjustmentFailure,
  createScenarioSplittingHooks,
} from './transaction-fault-fixture.js';

isolatedTest(
  'T025 dispatcher routes only to the matching scenario and stops after cleanup',
  async () => {
    const makeWorld = (tripId: string) => {
      const world = new LedgerWorld(null!, null!, 'http://localhost', tripId);
      world.splitting.ids.trips.set('日本旅行', tripId);

      return world;
    };
    const first = makeWorld('first');
    const second = makeWorld('second');
    const worlds = new Set([first, second]);
    const reached: string[] = [];
    first.splitting.hooks = {
      afterFirstAdjustmentInsert: async () => {
        reached.push('first');
        throw Error('injected');
      },
    };
    second.splitting.hooks = {
      afterFirstAdjustmentInsert: async () => {
        reached.push('second');
      },
    };
    const hooks = createScenarioSplittingHooks(worlds);
    const context = { tripId: 'first', ownerId: 'owner', commandId: 'command' };
    await expect(hooks.afterFirstAdjustmentInsert!(context)).rejects.toThrow('injected');
    expect(reached).toEqual(['first']);
    worlds.delete(first);
    await hooks.afterFirstAdjustmentInsert!(context);
    expect(reached).toEqual(['first']);
    await hooks.afterFirstAdjustmentInsert!({ ...context, tripId: 'second' });
    expect(reached).toEqual(['first', 'second']);
  },
);

test('T025 isolated Given arms the internal fault without executing the valid settlement', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await captureCurrentAmyArrangement(world);
  await runIsolatedStep(
    {
      phrase: '結清交易在寫入部分調整後將發生錯誤',
      input: undefined,
      execute: armPartialAdjustmentFailure,
    },
    world,
  );
  expect(world.get('splitting:faultReached')).toBe(false);
  expect(world.splitting.hooks?.afterFirstAdjustmentInsert).toEqual(expect.any(Function));
  expect(world.get('splitting:faultInput')).toEqual(world.get('splitting:settlementSnapshot'));
});
