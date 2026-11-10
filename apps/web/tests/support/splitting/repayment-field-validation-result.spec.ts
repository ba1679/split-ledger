import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { fillIndependentRepaymentDraft, type RepaymentDraft } from './repayment-draft.js';
import {
  saveIndependentRepayment,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';
import {
  assertRejectedRepaymentEvidence,
  assertRepaymentFieldValidation,
} from './repayment-field-validation-result.js';

test('T203: same-person rejection preserves the real form, original UUID and every ledger fact', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await fillIndependentRepaymentDraft(page, world, 'Amy', '100');
  await saveIndependentRepayment(page, world);
  await assertRepaymentFieldValidation(page, world, 'parties');
});

test('T203: only definite single rejected or locally blocked saves prove unchanged accounting', () => {
  const before = {
    sources: {
      trips: [],
      members: [],
      expenses: [],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    repayments: { items: [] },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    settlement: { accountingRevision: '4', simplifyDebts: false, balances: [], arrangements: [] },
    totals: { totals: [] },
  } satisfies BrowserSplittingSnapshot;
  const draft: RepaymentDraft = {
    id: 'original',
    payerMemberId: 'amy',
    payeeMemberId: 'amy',
    amount: '100',
    currencyCode: 'JPY',
    paidOn: '2027-03-12',
  };
  const action: IndependentRepaymentSave = {
    outcome: 'local-validation',
    draft,
    payload: null,
    status: null,
    response: null,
    before,
    after: before,
  };
  assertRejectedRepaymentEvidence(action, draft, before, [], 'trip');
  const posted = [{ method: 'POST', path: '/api/trips/trip/repayments', body: draft }];
  const rejected = {
    ...action,
    outcome: 'rejected' as const,
    payload: draft,
    status: 422,
    response: { code: 'VALIDATION_ERROR' },
  };
  assertRejectedRepaymentEvidence(rejected, draft, before, posted, 'trip');
  expect(() =>
    assertRejectedRepaymentEvidence({ ...rejected, status: 500 }, draft, before, posted, 'trip'),
  ).toThrow();
  expect(() =>
    assertRejectedRepaymentEvidence(
      { ...action, outcome: 'unconfirmed' },
      draft,
      before,
      [],
      'trip',
    ),
  ).toThrow();
  expect(() =>
    assertRejectedRepaymentEvidence(rejected, draft, before, [...posted, ...posted], 'trip'),
  ).toThrow();
  expect(() =>
    assertRejectedRepaymentEvidence(
      { ...action, draft: { ...draft, id: 'new-id' } },
      draft,
      before,
      [],
      'trip',
    ),
  ).toThrow();
  expect(() =>
    assertRejectedRepaymentEvidence(
      {
        ...action,
        after: { ...before, settlement: { ...before.settlement, accountingRevision: '5' } },
      },
      draft,
      before,
      [],
      'trip',
    ),
  ).toThrow();
  expect(() =>
    assertRejectedRepaymentEvidence(
      {
        ...action,
        after: {
          ...before,
          sources: { ...before.sources, adjustments: [{ id: 'hidden-adjustment' }] },
        },
      },
      draft,
      before,
      [],
      'trip',
    ),
  ).toThrow();
});
