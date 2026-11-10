import { test, expect } from '../fixtures.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { recordIndependentRepayment } from './independent-repayment-command.js';
import { runIsolatedStep } from './harness.js';
import {
  assertOverpaymentWarningBody,
  assertUnsavedOverpaymentWarning,
  overpaymentWarningResultPhrase,
} from './overpayment-warning-result.js';

test('T081 parameter-free warning validates exact excess, reverse endpoints, revision and token', () => {
  expect(overpaymentWarningResultPhrase).toBe('超額還款尚未保存並回傳 JPY 100 的反向應付警告');
  expect(overpaymentWarningResultPhrase).not.toMatch(/[{}]/);
  const members = { Alice: 'Alice', Amy: 'Amy' };
  const body = {
    code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
    message: '實付 700 超過應付 600，超額 100 將成為反向應付。',
    confirmation: {
      accountingRevision: '8',
      excessAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
      reverseDebtorMemberId: 'Alice',
      reverseCreditorMemberId: 'Amy',
      confirmationToken: 'server-issued-opaque-token',
    },
  };
  expect(() => assertOverpaymentWarningBody(body, '8', members)).not.toThrow();
  for (const invalid of [
    { field: 'amount' },
    { requestId: 'request-42' },
    { field: null },
    { field: 3 },
    { requestId: false },
    { requestId: null },
    { token: 'session-secret' },
    { privateExpense: { amount: '1234' } },
  ])
    expect(() => assertOverpaymentWarningBody({ ...body, ...invalid }, '8', members)).toThrow();
  for (const patch of [
    { accountingRevision: '7' },
    { excessAmount: { numerator: '100', denominator: '3', minorUnit: 0 } },
    { reverseDebtorMemberId: 'Amy' },
    { reverseCreditorMemberId: 'Alice' },
    { confirmationToken: '' },
    { confirmationToken: '   ' },
  ])
    expect(() =>
      assertOverpaymentWarningBody(
        { ...body, confirmation: { ...body.confirmation, ...patch } },
        '8',
        members,
      ),
    ).toThrow();
  for (const patch of [
    { code: 'VALIDATION_ERROR' },
    { message: '還款失敗' },
    { message: '1700 超過 1600，差額 1100' },
  ])
    expect(() => assertOverpaymentWarningBody({ ...body, ...patch }, '8', members)).toThrow();
});

test('T081 isolated overpayment warning Then reads unchanged real sources and arrangement', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '超額還款來源', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await recordIndependentRepayment(world, '700');
  await runIsolatedStep(
    {
      phrase: overpaymentWarningResultPhrase,
      input: undefined,
      execute: assertUnsavedOverpaymentWarning,
    },
    world,
  );
});
