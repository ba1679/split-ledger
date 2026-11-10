import { test, expect } from '../fixtures.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { snapshotExactBalances } from '../../../../api/tests/support/splitting/simplification-mode-fixture.js';
import { directExpenseArrangements } from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { fillIndependentRepaymentDraft, type RepaymentDraft } from './repayment-draft.js';
import { saveIndependentRepayment } from './save-independent-repayment.js';
import {
  arrangeLostRepaymentResponse,
  lostRepaymentResponseKey,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';
import {
  assertSavedPartialRepayment,
  assertSavedPartialRepaymentScreen,
  savedPartialRepaymentPhrase,
} from './saved-partial-repayment-result.js';

const draft: RepaymentDraft = {
  id: 'partial',
  payerMemberId: 'amy',
  payeeMemberId: 'alice',
  currencyCode: 'JPY',
  amount: '400',
  paidOn: '2027-03-12',
};

function snapshot(complete: boolean): BrowserSplittingSnapshot {
  const repayment = (id: string, amount: string) => ({
    id,
    trip_id: 'trip',
    owner_id: 'owner',
    payer_member_id: 'amy',
    payee_member_id: 'alice',
    currency_code: 'JPY',
    amount_minor: amount,
    minor_unit: 0,
    paid_on: '2027-03-12',
    created_at: '2027-03-12T00:00:00Z',
    kind: 'independent',
    settlement_id: null,
  });
  const sources = {
    trips: [
      {
        id: 'trip',
        owner_id: 'owner',
        accounting_revision: complete ? '2' : '1',
        simplify_debts: false,
      },
    ],
    members: [{ id: 'alice' }, { id: 'amy' }],
    expenses: [
      {
        id: 'advance',
        currency_code: 'JPY',
        payer_member_id: 'alice',
        amount_minor: '1000',
        minor_unit: 0,
      },
      {
        id: 'twd',
        currency_code: 'TWD',
        payer_member_id: 'alice',
        amount_minor: '30000',
        minor_unit: 2,
      },
    ],
    shares: [
      { expense_id: 'advance', member_id: 'amy' },
      { expense_id: 'twd', member_id: 'amy' },
    ],
    repayments: complete ? [repayment('partial', '400')] : [],
    settlements: [],
    adjustments: [],
  };

  return {
    sources,
    expenses: { items: [], totalCount: 2, nextCursor: null },
    repayments: { items: sources.repayments.map(historicalRepaymentProjection) },
    totals: { totals: [] },
    settlement: {
      accountingRevision: complete ? '2' : '1',
      simplifyDebts: false,
      balances: snapshotExactBalances(sources).map(({ amount: netAmount, ...row }) => ({
        ...row,
        netAmount,
      })),
      arrangements: directExpenseArrangements(sources).map((row, i) => ({
        ...row,
        key: String(i),
      })),
    },
  };
}

test('T197 authority rejects stale debt, changed TWD, wrong date, duplicate cash and adjustment', () => {
  expect(savedPartialRepaymentPhrase).toBe(
    '已保存 JPY 400 實付且 Amy 剩餘應付 Alice JPY 600、TWD 300',
  );
  const before = snapshot(false);
  const after = snapshot(true);
  const saved = after.repayments.items[0]!;
  const check = (value: BrowserSplittingSnapshot) =>
    assertSavedPartialRepayment(before, value, draft, saved, 'trip', 'alice', 'amy');
  expect(() => check(after)).not.toThrow();
  const stale = structuredClone(after);
  stale.settlement.arrangements = before.settlement.arrangements;
  expect(() => check(stale)).toThrow();
  const twd = structuredClone(after);
  twd.sources.expenses[1]!.amount_minor = '40000';
  expect(() => check(twd)).toThrow();
  const wrongDate = structuredClone(after);
  wrongDate.repayments.items[0]!.paidOn = '2027-03-13';
  expect(() => check(wrongDate)).toThrow();
  const duplicate = structuredClone(after);
  duplicate.sources = {
    ...duplicate.sources,
    repayments: [
      ...duplicate.sources.repayments,
      { ...duplicate.sources.repayments[0]!, id: 'duplicate' },
    ],
  };
  expect(() => check(duplicate)).toThrow();
  const adjustment = structuredClone(after);
  adjustment.sources = {
    ...adjustment.sources,
    adjustments: [
      { id: 'fake', member_id: 'amy', numerator: '1', denominator: '1', minor_unit: 0 },
    ],
  };
  expect(() => check(adjustment)).toThrow();
});

for (const lost of [false, true])
  test(`T197 real product partial save ${lost ? 'recovers original UUID' : 'returns success'}`, async ({
    page,
    world,
  }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    await fillIndependentRepaymentDraft(page, world, 'Alice', '400');
    if (lost) await arrangeLostRepaymentResponse(page, world, 'available');
    try {
      await saveIndependentRepayment(page, world);
      await runIsolatedStep(
        {
          phrase: savedPartialRepaymentPhrase,
          input: undefined,
          execute: (context) => assertSavedPartialRepaymentScreen(page, context),
        },
        world,
      );
    } finally {
      if (world.state.has(lostRepaymentResponseKey))
        await world
          .get<LostRepaymentResponseState>(lostRepaymentResponseKey)
          .interceptor?.restore();
    }
  });
