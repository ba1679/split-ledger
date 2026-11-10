import { test, expect } from '../fixtures.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import { recordIndependentRepayment } from './independent-repayment-command.js';
import { seedOverpaymentWarning } from './overpayment-warning-fixture.js';
import { submitConfirmedOverpayment } from './confirm-overpayment-command.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import {
  assertIndependentRepaymentWrite,
  assertSavedIndependentRepayment,
  savedIndependentRepaymentPhrase,
} from './saved-independent-repayment-result.js';
import type { SourceSnapshot } from './types.js';

test('T078 quoted amount and authoritative create fields reject altered facts', () => {
  expect(savedIndependentRepaymentPhrase).toBe('獨立還款已以 JPY {string} 保存');
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', accounting_revision: '8', simplify_debts: false }],
    members: [],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const request = {
    id: 'reserved',
    payerMemberId: 'Amy',
    payeeMemberId: 'Alice',
    amount: '400',
    currencyCode: 'JPY',
    paidOn: '2027-01-20',
  };
  const after: SourceSnapshot = {
    ...before,
    trips: [{ ...before.trips[0], accounting_revision: '9' }],
    repayments: [
      {
        id: request.id,
        trip_id: 'trip',
        payer_member_id: 'Amy',
        payee_member_id: 'Alice',
        amount_minor: '400',
        currency_code: 'JPY',
        minor_unit: 0,
        paid_on: '2027-01-20',
        kind: 'independent',
        settlement_id: null,
        created_at: '2027-01-20T00:00:00Z',
      },
    ],
  };
  const reply = historicalRepaymentProjection(after.repayments[0]!);
  expect(() => assertIndependentRepaymentWrite(before, after, request, '400', reply)).not.toThrow();
  for (const [field, value] of Object.entries({
    id: 'wrong',
    trip_id: 'wrong',
    payer_member_id: 'wrong',
    payee_member_id: 'wrong',
    amount_minor: '401',
    currency_code: 'TWD',
    minor_unit: 2,
    paid_on: '2027-01-21',
    kind: 'settlement',
    settlement_id: 'linked',
  })) {
    const changed = structuredClone(after);
    changed.repayments[0]![field] = value;
    expect(() => assertIndependentRepaymentWrite(before, changed, request, '400', reply)).toThrow();
  }
  for (const key of [
    'members',
    'expenses',
    'shares',
    'settlements',
    'adjustments',
    'repayments',
  ] as const) {
    const changed = { ...after, [key]: [...after[key], { id: 'unexpected' }] };
    expect(() => assertIndependentRepaymentWrite(before, changed, request, '400', reply)).toThrow();
  }
  for (const revision of ['8', '10'])
    expect(() =>
      assertIndependentRepaymentWrite(
        before,
        { ...after, trips: [{ ...after.trips[0], accounting_revision: revision }] },
        request,
        '400',
        reply,
      ),
    ).toThrow();
  for (const field of Object.keys(reply))
    expect(() =>
      assertIndependentRepaymentWrite(before, after, request, '400', {
        ...reply,
        [field]: 'altered',
      }),
    ).toThrow();
});

for (const amount of ['400', '700']) {
  test(`T078 isolated saved JPY ${amount} verifies response DB list and detail`, async ({
    world,
  }) => {
    if (amount === '700') {
      await seedOverpaymentWarning(world);
      await submitConfirmedOverpayment(world);
    } else {
      await seedSplittingExpenses(world, [
        { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
        { 項目: '車票', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
      ]);
      await recordIndependentRepayment(world, amount);
    }
    await runIsolatedStep(
      {
        phrase: savedIndependentRepaymentPhrase,
        input: amount,
        execute: assertSavedIndependentRepayment,
      },
      world,
    );
  });
}
