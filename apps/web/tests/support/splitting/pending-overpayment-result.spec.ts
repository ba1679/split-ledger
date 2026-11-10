import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import { fillIndependentRepaymentDraft } from './repayment-draft.js';
import { saveIndependentRepayment } from './save-independent-repayment.js';
import {
  assertPendingOverpayment,
  assertPendingOverpaymentEvidence,
  pendingOverpaymentPhrase,
} from './pending-overpayment-result.js';

test('T199 rejects stale revision, fabricated warning, reversed endpoints, saved facts and repeated POST', () => {
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
  const check = (w = warning, current = before, sent = writes) =>
    assertPendingOverpaymentEvidence(request, w, before, current, sent, 'trip');
  expect(() => check()).not.toThrow();
  expect(() => check({ ...warning, code: 'VALIDATION_ERROR' })).toThrow();
  expect(() =>
    check({ ...warning, confirmation: { ...warning.confirmation, accountingRevision: '3' } }),
  ).toThrow();
  expect(() =>
    check({ ...warning, confirmation: { ...warning.confirmation, confirmationToken: '' } }),
  ).toThrow();
  expect(() =>
    check({ ...warning, confirmation: { ...warning.confirmation, reverseDebtorMemberId: 'amy' } }),
  ).toThrow();
  expect(() =>
    check({
      ...warning,
      confirmation: {
        ...warning.confirmation,
        excessAmount: { numerator: '200', denominator: '1', minorUnit: 0 },
      },
    }),
  ).toThrow();
  expect(() =>
    check(warning, {
      ...before,
      repayments: { items: [...before.repayments.items, { id: request.id }] },
    }),
  ).toThrow();
  expect(() => check(warning, before, [...writes, ...writes])).toThrow();
});

test('T199 isolated real product preserves pending overpayment warning without writing', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await fillIndependentRepaymentDraft(page, world, 'Alice', '700');
  await saveIndependentRepayment(page, world);
  await runIsolatedStep(
    {
      phrase: pendingOverpaymentPhrase,
      input: undefined,
      execute: (context) => assertPendingOverpayment(page, context),
    },
    world,
  );
});
