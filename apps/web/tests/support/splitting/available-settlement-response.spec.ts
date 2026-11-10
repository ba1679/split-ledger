import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, readBrowserSplittingSnapshot } from './fixture.js';
import { openBrowserSettlementForm } from './settlement-form.js';
import {
  arrangeLostSettlementResponse,
  lostSettlementResponseKey,
  type LostSettlementResponseState,
} from './lost-settlement-response.js';

test('T143: isolated Given leaves original-ID verification available without submitting', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  await runIsolatedStep(
    {
      phrase: '結清成功回應遺失但原結果可查證',
      input: undefined,
      execute: (context) => arrangeLostSettlementResponse(page, context, 'available'),
    },
    world,
  );
  const state = world.get<LostSettlementResponseState>(lostSettlementResponseKey);
  try {
    expect(state.availability).toBe('available');
    expect(state.ids.commandId).toBe(state.draft.id);
    expect(state.ids.repaymentId).toBe(state.draft.repaymentId);
    expect(state.ids.commandId).not.toBe(state.ids.repaymentId);
    expect(state.mutations).toEqual([]);
    expect(state.lookups).toEqual([]);
    expect(state.command).toBeUndefined();
    expect(state.savedResponse).toBeUndefined();
    expect(state.authoritativeAfter).toBeUndefined();
    expect(await readBrowserSplittingSnapshot(world)).toEqual(state.before);
  } finally {
    await state.interceptor?.restore();
  }
});
