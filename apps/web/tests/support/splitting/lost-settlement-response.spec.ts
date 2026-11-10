import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openBrowserSettlementForm, type BrowserSettlementDraft } from './settlement-form.js';
import {
  arrangeLostSettlementResponse,
  assertSettlementPayload,
  lostSettlementTemporaryPhrase,
  lostSettlementResponseKey,
  type LostSettlementResponseState,
} from './lost-settlement-response.js';

const draft: BrowserSettlementDraft = {
  id: 'original-settlement-uuid',
  repaymentId: 'original-repayment-uuid',
  arrangementKey: 'opaque-original-key',
  accountingRevision: '7',
  debtorMemberId: 'amy',
  creditorMemberId: 'alice',
  currencyCode: 'JPY',
  expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
  paidOn: '2027-03-12',
};

test('T142: request preserves two IDs and original exact arrangement snapshot', () => {
  assertSettlementPayload({ ...draft, paidAmount: '33' }, draft);
  for (const mutation of [
    { id: 'replacement-settlement' },
    { repaymentId: 'replacement-repayment' },
    { arrangementKey: 'another-key' },
    { accountingRevision: '8' },
    { debtorMemberId: 'alice' },
    { creditorMemberId: 'amy' },
    { currencyCode: 'TWD' },
    { expectedAmount: { numerator: '3333', denominator: '100', minorUnit: 0 } },
    { paidOn: '2027-03-11' },
    { paidAmount: '0' },
    { paidAmount: '-33' },
    { paidAmount: '33.1' },
    { rounding: 'down' },
  ])
    expect(() =>
      assertSettlementPayload({ ...draft, paidAmount: '33', ...mutation }, draft),
    ).toThrow();
});

test('T142: isolated Given arms transport loss without sending a settlement POST', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  await runIsolatedStep(
    {
      phrase: lostSettlementTemporaryPhrase,
      input: undefined,
      execute: (context) => arrangeLostSettlementResponse(page, context, 'temporary-not-found'),
    },
    world,
  );
  const state = world.get<LostSettlementResponseState>(lostSettlementResponseKey);
  try {
    expect(state.availability).toBe('temporary-not-found');
    expect(state.ids.commandId).toBe(state.draft.id);
    expect(state.ids.repaymentId).toBe(state.draft.repaymentId);
    expect(state.ids.commandId).not.toBe(state.ids.repaymentId);
    expect(state.mutations).toEqual([]);
    expect(state.lookups).toEqual([]);
    expect(state.authoritativeAfter).toBeUndefined();
    expect(state.savedResponse).toBeUndefined();
  } finally {
    await state.interceptor?.restore();
  }
});
