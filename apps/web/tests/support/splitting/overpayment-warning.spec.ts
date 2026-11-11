import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import {
  arrangeBrowserOverpaymentWarning,
  assertBrowserOverpaymentWarning,
  browserOverpaymentWarningPhrase,
} from './overpayment-warning.js';

test('T129: warning contract rejects changed revision, reverse parties, token and excess', () => {
  const request = {
    id: 'reserved',
    payerMemberId: 'amy',
    payeeMemberId: 'alice',
    amount: '700',
    currencyCode: 'JPY',
    paidOn: '2027-03-12',
  } as const;
  const valid = {
    code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
    message: '超額',
    confirmation: {
      accountingRevision: '2',
      reverseDebtorMemberId: 'alice',
      reverseCreditorMemberId: 'amy',
      confirmationToken: 'real-token-shape',
      excessAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
    },
  };
  assertBrowserOverpaymentWarning(valid, request, '2');
  for (const change of [
    { accountingRevision: '1' },
    { reverseDebtorMemberId: 'amy' },
    { reverseCreditorMemberId: 'alice' },
    { confirmationToken: '' },
    { excessAmount: { numerator: '200', denominator: '1', minorUnit: 0 } },
  ])
    expect(() =>
      assertBrowserOverpaymentWarning(
        { ...valid, confirmation: { ...valid.confirmation, ...change } },
        request,
        '2',
      ),
    ).toThrow();
});

test('T129: isolated real warning Given keeps original UUID and all sources unsaved', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await runIsolatedStep(
    {
      phrase: browserOverpaymentWarningPhrase,
      input: undefined,
      execute: (context) => arrangeBrowserOverpaymentWarning(page, context),
    },
    world,
  );
});
