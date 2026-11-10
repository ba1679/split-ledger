import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { fillSharedSnackDraft } from './expense-draft.js';
import { saveSharedExpense } from './save-shared-expense.js';
import {
  assertNonsharingPayer,
  assertNonsharingPayerProjection,
  nonsharingPayerResultPhrase,
} from './nonsharing-payer-result.js';
import type { BrowserSplittingSnapshot } from './fixture.js';
import { assertMemberShareDisplay } from './expense-share-display-result.js';

test('T180: the visible share list rejects an additional payer row even when its amount is zero', async ({
  page,
}) => {
  await page.setContent(
    '<section id="card"><ul aria-label="支出分攤"><li>Amy <output aria-label="JPY 50">JPY 50</output></li><li>Bob <output aria-label="JPY 50">JPY 50</output></li></ul></section>',
  );
  const card = page.locator('#card');
  await assertMemberShareDisplay(card, ['Amy', 'Bob'], 'JPY 50');
  await card.locator('ul').evaluate((list) => {
    const extra = document.createElement('li');
    extra.textContent = 'Alice JPY 0';
    list.append(extra);
  });
  await expect(assertMemberShareDisplay(card, ['Amy', 'Bob'], 'JPY 50')).rejects.toThrow();
});

function snapshot(): BrowserSplittingSnapshot {
  const fifty = { numerator: '50', denominator: '1', minorUnit: 0 };

  return {
    sources: {
      members: ['Alice', 'Amy', 'Bob'].map((name) => ({ id: name, name })),
      expenses: [
        {
          id: 'snack',
          payer_member_id: 'Alice',
          amount_minor: '100',
          currency_code: 'JPY',
          minor_unit: 0,
        },
      ],
      shares: ['Amy', 'Bob'].map((id) => ({
        expense_id: 'snack',
        member_id: id,
        amount_numerator: '50',
        amount_denominator: '1',
        minor_unit: 0,
      })),
      repayments: [],
      settlements: [],
      adjustments: [],
      trips: [],
    },
    expenses: {
      items: [
        {
          id: 'snack',
          item: '點心',
          currencyCode: 'JPY',
          payerMemberId: 'Alice',
          amount: '100',
          shares: ['Amy', 'Bob'].map((memberId) => ({ memberId, amount: fifty })),
        },
      ],
      totalCount: 1,
      nextCursor: null,
    },
    settlement: {
      accountingRevision: '1',
      simplifyDebts: false,
      balances: ['Alice', 'Amy', 'Bob'].map((memberId) => ({
        memberId,
        currencyCode: 'JPY',
        netAmount: { ...fifty, numerator: memberId === 'Alice' ? '100' : '-50' },
      })),
      arrangements: ['Amy', 'Bob'].map((id) => ({
        key: id,
        debtorMemberId: id,
        creditorMemberId: 'Alice',
        currencyCode: 'JPY',
        amount: fifty,
      })),
    },
  } as unknown as BrowserSplittingSnapshot;
}

test('T180: exact complete shares, payer receivable and two arrangements reject self-sharing and hidden debt', () => {
  assertNonsharingPayerProjection(snapshot(), 'snack');
  for (const mutate of [
    (state: BrowserSplittingSnapshot) => {
      state.expenses.items[0]!.shares[0]!.memberId = 'Alice';
    },
    (state: BrowserSplittingSnapshot) => {
      state.expenses.items[0]!.payerMemberId = 'Amy';
    },
    (state: BrowserSplittingSnapshot) => {
      state.settlement.balances[0]!.netAmount = {
        ...state.settlement.balances[0]!.netAmount,
        numerator: '50',
      };
    },
    (state: BrowserSplittingSnapshot) => {
      state.settlement.arrangements[0]!.creditorMemberId = 'Amy';
    },
    (state: BrowserSplittingSnapshot) => {
      state.settlement.arrangements.pop();
    },
    (state: BrowserSplittingSnapshot) => {
      state.sources = {
        ...state.sources,
        shares: [...state.sources.shares, { expense_id: 'snack', member_id: 'Alice' }],
      };
    },
  ]) {
    const state = snapshot();
    mutate(state);
    expect(() => assertNonsharingPayerProjection(state, 'snack')).toThrow();
  }
});

test('T180: isolated Then checks real saved nonsharing-payer UI and owner authority', async ({
  page,
  world,
}) => {
  await fillSharedSnackDraft(page, world, 'Amy、Bob');
  await saveSharedExpense(page, world);
  await runIsolatedStep(
    {
      phrase: nonsharingPayerResultPhrase,
      input: undefined,
      execute: async (context) => assertNonsharingPayer(page, context),
    },
    world,
  );
});
