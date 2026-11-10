import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import { arrangeBrowserOverpaymentWarning } from './overpayment-warning.js';
import { cancelBrowserOverpayment, type CancelledOverpayment } from './cancel-overpayment.js';
import {
  assertCancelledOverpayment,
  assertCancelledOverpaymentEvidence,
  cancelledOverpaymentResultPhrase,
} from './cancelled-overpayment-result.js';

test('T201 rejects an extra confirmation, changed UUID, altered history, revision or remaining debt', () => {
  const request = {
    id: 'pending',
    payerMemberId: 'amy',
    payeeMemberId: 'alice',
    amount: '700',
    currencyCode: 'JPY' as const,
    paidOn: '2027-03-12',
  };
  const warning = {
    code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
    message: '超額 JPY 100',
    confirmation: {
      accountingRevision: '4',
      confirmationToken: 'server-token',
      reverseDebtorMemberId: 'alice',
      reverseCreditorMemberId: 'amy',
      excessAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
    },
  };
  const before = {
    sources: { repayments: [{ id: 'prior' }] },
    repayments: { items: [{ id: 'prior' }] },
    settlement: {
      accountingRevision: '4',
      arrangements: ['JPY', 'TWD'].map((currencyCode) => ({
        key: currencyCode,
        currencyCode,
        debtorMemberId: 'amy',
        creditorMemberId: 'alice',
        amount: {
          numerator: currencyCode === 'JPY' ? '600' : '300',
          denominator: '1',
          minorUnit: 0,
        },
      })),
    },
  } as unknown as BrowserSplittingSnapshot;
  const writes = [{ method: 'POST', path: '/api/trips/trip/repayments', body: request }];
  const action: CancelledOverpayment = {
    warning: {
      request,
      warning,
      confirmation: warning.confirmation,
      before,
      warningPost: writes[0]!,
    },
    writesBefore: writes,
    writesAfter: writes,
  };
  const check = (current = before, sent = writes, cancelled = action) =>
    assertCancelledOverpaymentEvidence(cancelled, current, sent, 'trip');
  expect(() => check()).not.toThrow();
  expect(() => check(before, [...writes, ...writes])).toThrow();
  expect(() =>
    check(before, [{ ...writes[0]!, body: { ...request, id: 'replacement' } }]),
  ).toThrow();
  expect(() => check({ ...before, repayments: { items: [{ id: 'pending' }] } })).toThrow();
  expect(() =>
    check({ ...before, sources: { ...before.sources, adjustments: [{ id: 'hidden' }] } }),
  ).toThrow();
  expect(() =>
    check({ ...before, settlement: { ...before.settlement, accountingRevision: '5' } }),
  ).toThrow();
  expect(() =>
    check({
      ...before,
      settlement: { ...before.settlement, arrangements: before.settlement.arrangements.slice(1) },
    }),
  ).toThrow();
  expect(() => check(before, writes, { ...action, writesAfter: [...writes, ...writes] })).toThrow();
});

test('T201 isolated real product cancellation preserves JPY600 and TWD300 without saving', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await arrangeBrowserOverpaymentWarning(page, world);
  await cancelBrowserOverpayment(page, world);
  await runIsolatedStep(
    {
      phrase: cancelledOverpaymentResultPhrase,
      input: undefined,
      execute: (context) => assertCancelledOverpayment(page, context),
    },
    world,
  );
});
