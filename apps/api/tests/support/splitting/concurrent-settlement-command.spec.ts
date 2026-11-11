import { test, expect } from '../fixtures.js';
import {
  concurrentSettlementPhrase,
  requestConcurrentSettlements,
  settlementRaceBarrier,
} from './concurrent-settlement-command.js';
import { captureCurrentAmyArrangement } from './current-arrangement-fixture.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';

test('T058 barrier waits for both distinct commands and releases both without picking a winner', async () => {
  expect(concurrentSettlementPhrase).toBe('兩個裝置同時結清 Amy 向 Alice 的同一安排');
  const barrier = settlementRaceBarrier(['first', 'second']);
  let firstReleased = false;
  const first = barrier.enter({ ownerId: 'owner', tripId: 'trip', commandId: 'first' }).then(() => {
    firstReleased = true;
  });
  await Promise.resolve();
  expect(firstReleased).toBe(false);
  await Promise.all([
    first,
    barrier.enter({ ownerId: 'owner', tripId: 'trip', commandId: 'second' }),
  ]);
  expect(firstReleased).toBe(true);
  expect([...barrier.arrived]).toEqual(['first', 'second']);
  barrier.dispose();
});

test('T058 barrier fails boundedly when the second command never arrives', async () => {
  const barrier = settlementRaceBarrier(['first', 'second'], 10);
  await expect(
    barrier.enter({ ownerId: 'owner', tripId: 'trip', commandId: 'first' }),
  ).rejects.toThrow('Both settlement commands must reach');
  barrier.dispose();
});

test('T058 isolated concurrent event sends the same arrangement with two sessions and UUID pairs', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '33', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await captureCurrentAmyArrangement(world);
  await runIsolatedStep(
    { phrase: concurrentSettlementPhrase, input: undefined, execute: requestConcurrentSettlements },
    world,
  );
  const commands = world.get<
    ReturnType<typeof import('./settle-amy-command.js').amySettlementRequest>[]
  >('splitting:concurrentCommands');
  expect(commands.map((command) => command.paidAmount)).toEqual(['33', '34']);
  expect(new Set(commands.flatMap((command) => [command.id, command.repaymentId])).size).toBe(4);
  expect(commands[0]!.arrangementKey).toBe(commands[1]!.arrangementKey);
  expect(commands[0]!.accountingRevision).toBe(commands[1]!.accountingRevision);
  expect(commands[0]!.expectedAmount).toEqual(commands[1]!.expectedAmount);
});
