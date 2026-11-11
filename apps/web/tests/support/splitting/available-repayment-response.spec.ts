import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { fillIndependentRepaymentDraft } from './repayment-draft.js';
import {
  arrangeLostRepaymentResponse,
  lostRepaymentResponseKey,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';

test('T135: isolated Given drops the next real POST response while retaining original UUID lookup', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await fillIndependentRepaymentDraft(page, world, 'Alice', '400');
  await runIsolatedStep(
    {
      phrase: '獨立還款成功回應遺失但原結果可查證',
      input: undefined,
      execute: (context) => arrangeLostRepaymentResponse(page, context, 'available'),
    },
    world,
  );
  const state = world.get<LostRepaymentResponseState>(lostRepaymentResponseKey);
  try {
    expect(state.availability).toBe('available');
    expect(state.ids.commandId).toBe(state.draft.id);
    expect(state.ids.repaymentId).toBe(state.draft.id);
    expect(state.ids.mutationIds).toEqual([]);
    expect(state.ids.lookupIds).toEqual([]);
    expect(state.mutations).toEqual([]);
    expect(state.lookups).toEqual([]);
    expect(state.authoritativeAfter).toBeUndefined();
    expect(state.savedResponse).toBeUndefined();
    expect(state.interceptor).toBeDefined();
  } finally {
    await state.interceptor?.restore();
  }
});
