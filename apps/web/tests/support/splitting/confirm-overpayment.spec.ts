import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import {
  arrangeBrowserOverpaymentWarning,
  type BrowserOverpaymentWarning,
} from './overpayment-warning.js';
import { lowerExpenseOnAnotherDevice } from './stale-overpayment-warning.js';
import {
  assertOriginalOverpaymentConfirmation,
  confirmBrowserOverpayment,
  confirmOverpaymentPhrase,
} from './confirm-overpayment.js';

for (const stale of [false, true]) {
  test(`T166: explicitly confirm the original overpayment${stale ? ' after a revision change' : ''}`, async ({
    page,
    world,
  }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    await seedBrowserIndependentRepayment(world, '400');
    await arrangeBrowserOverpaymentWarning(page, world);
    if (stale) await lowerExpenseOnAnotherDevice(page, world);
    await runIsolatedStep(
      {
        phrase: confirmOverpaymentPhrase,
        input: undefined,
        execute: (context) => confirmBrowserOverpayment(page, context),
      },
      world,
    );
  });
}

test('T166: confirmation payload rejects changed commands and forged tokens', () => {
  const original = {
    request: {
      id: '5e31016d-5bb9-4c2e-a953-e15b9e09ce4c',
      payerMemberId: '3d120fbc-2648-4f27-89c7-c9345712d307',
      payeeMemberId: '85e39d52-98bb-4fc8-a9ca-a05a08321b59',
      currencyCode: 'JPY',
      amount: '700',
      paidOn: '2027-03-12',
    },
    confirmation: {
      accountingRevision: '7',
      excessAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
      reverseDebtorMemberId: '85e39d52-98bb-4fc8-a9ca-a05a08321b59',
      reverseCreditorMemberId: '3d120fbc-2648-4f27-89c7-c9345712d307',
      confirmationToken: 'server-token',
    },
  } as BrowserOverpaymentWarning;
  const valid = { ...original.request, overpaymentConfirmation: original.confirmation };
  expect(() => assertOriginalOverpaymentConfirmation(valid, original)).not.toThrow();
  for (const invalid of [
    { ...valid, id: 'another-command' },
    { ...valid, amount: '701' },
    { ...valid, paidOn: '2027-03-13' },
    { ...valid, overpaymentConfirmation: true },
    { ...valid, overpaymentConfirmation: { ...original.confirmation, accountingRevision: '8' } },
    {
      ...valid,
      overpaymentConfirmation: { ...original.confirmation, confirmationToken: 'forged' },
    },
  ])
    expect(() => assertOriginalOverpaymentConfirmation(invalid, original)).toThrow();
});
