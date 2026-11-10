import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  seedLostSettlementResponse,
  type LostSettlementCommand,
} from './lost-settlement-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T021: committed settlement retains its reserved IDs without a caller success response', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: 'Amy 的安排已以 JPY 33 結清但保存回應曾遺失',
      input: undefined,
      execute: seedLostSettlementResponse,
    },
    world,
  );
  const command = world.get<LostSettlementCommand>('splitting:lostSettlementCommand');
  const snapshot = world.get<SourceSnapshot>('splitting:lostSettlementSnapshot');
  expect(world.response).toBeUndefined();
  expect(command.id).toBe(world.get('splitting:settlementId'));
  expect(command.repaymentId).toBe(world.get('splitting:settlementRepaymentId'));
  expect(snapshot.settlements).toHaveLength(1);
  expect(snapshot.repayments).toHaveLength(1);
  expect(snapshot.adjustments).toHaveLength(2);
  expect(snapshot.settlements[0]!.id).toBe(command.id);
  expect(snapshot.repayments[0]!.id).toBe(command.repaymentId);
  expect(world.state.has('splitting:newSettlementId')).toBe(false);
});
