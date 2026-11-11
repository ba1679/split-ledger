import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import {
  arrangeBrowserOverpaymentWarning,
  type BrowserOverpaymentWarning,
} from './overpayment-warning.js';
import { lowerExpenseOnAnotherDevice } from './stale-overpayment-warning.js';
import { confirmBrowserOverpayment, type ConfirmedOverpayment } from './confirm-overpayment.js';
import {
  assertStaleOverpaymentEvidence,
  assertStaleOverpaymentResult,
  staleOverpaymentResultPhrase,
} from './stale-overpayment-result.js';

test('T205 rejects stale acceptance, changed authority, automatic confirmation and replacement UUID', () => {
  const request = {
    id: 'pending',
    payerMemberId: 'amy',
    payeeMemberId: 'alice',
    currencyCode: 'JPY' as const,
    amount: '700',
    paidOn: '2027-03-12',
  };
  const original = {
    request,
    confirmation: { accountingRevision: '4', confirmationToken: 'old-token' },
    warningPost: { method: 'POST', path: '/api/trips/trip/repayments', body: request },
  } as unknown as BrowserOverpaymentWarning;
  const corrected = {
    sources: { settlements: [], adjustments: [] },
    repayments: { items: [{ id: 'prior' }] },
    settlement: {
      accountingRevision: '5',
      arrangements: ['JPY', 'TWD'].map((currencyCode) => ({
        key: currencyCode,
        currencyCode,
        debtorMemberId: 'amy',
        creditorMemberId: 'alice',
        amount: {
          numerator: currencyCode === 'JPY' ? '500' : '300',
          denominator: '1',
          minorUnit: 0,
        },
      })),
    },
  } as unknown as BrowserSplittingSnapshot;
  const action: ConfirmedOverpayment = {
    original,
    before: corrected,
    payload: { ...request, overpaymentConfirmation: original.confirmation },
    status: 409,
    response: { code: 'ACCOUNTING_REVISION_CONFLICT' },
    writes: [],
  };
  const writes = [
    original.warningPost,
    { method: 'POST', path: original.warningPost.path, body: action.payload },
  ];
  const refresh = { method: 'POST', path: original.warningPost.path, body: request };
  const check = (a = action, current = corrected, sent = writes) =>
    assertStaleOverpaymentEvidence(a, corrected, current, sent, 'trip');
  expect(() => check()).not.toThrow();
  expect(() => check(action, corrected, [...writes, refresh])).not.toThrow();
  expect(() => check({ ...action, status: 201 })).toThrow();
  expect(() =>
    check({ ...action, response: { code: 'OVERPAYMENT_CONFIRMATION_REQUIRED' } }),
  ).toThrow();
  expect(() =>
    check(action, {
      ...corrected,
      repayments: { items: [...corrected.repayments.items, { id: 'pending' }] },
    }),
  ).toThrow();
  expect(() => check(action, corrected, [...writes, writes[1]!])).toThrow();
  expect(() =>
    check(action, corrected, [...writes, { ...refresh, body: { ...request, id: 'replacement' } }]),
  ).toThrow();
  expect(() => check(action, corrected, [...writes, refresh, refresh])).toThrow();
  expect(() =>
    check({ ...action, payload: { ...request, overpaymentConfirmation: true } }),
  ).toThrow();
});

test('T205 isolated real product rejects stale confirmation and presents a fresh pending warning', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await arrangeBrowserOverpaymentWarning(page, world);
  await lowerExpenseOnAnotherDevice(page, world);
  await confirmBrowserOverpayment(page, world);
  await runIsolatedStep(
    {
      phrase: staleOverpaymentResultPhrase,
      input: undefined,
      execute: (context) => assertStaleOverpaymentResult(page, context),
    },
    world,
  );
});
