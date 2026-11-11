import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { deactivateSplittingMember } from './inactive-member-fixture.js';
import { changeCompanionStatus } from './member-status-command.js';
import {
  assertCompanionStatus,
  assertOnlyMemberStatusChanged,
  assertStatusBalances,
  memberStatusResultPhrase,
} from './member-status-result.js';
import type { SourceSnapshot } from './types.js';

test('T073 status signature and history invariants reject side effects', () => {
  expect(memberStatusResultPhrase).toBe('同行者 {string} 的狀態為 {string}');
  expect(memberStatusResultPhrase.match(/\{string\}/g)).toHaveLength(2);
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', accounting_revision: '4' }],
    members: [{ id: 'Amy', role: 'companion', is_active: true }],
    expenses: [{ id: 'expense', payer_member_id: 'Amy' }],
    shares: [{ member_id: 'Amy' }],
    repayments: [{ payer_member_id: 'Amy' }],
    settlements: [{ debtor_member_id: 'Amy' }],
    adjustments: [{ member_id: 'Amy' }],
  };
  const after = {
    ...before,
    members: [{ ...before.members[0], is_active: false }],
    trips: [{ id: 'trip', accounting_revision: '5' }],
  };
  expect(() => assertOnlyMemberStatusChanged(before, after, 'Amy', false)).not.toThrow();
  expect(() => assertOnlyMemberStatusChanged(before, before, 'Amy', false)).toThrow();
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(() =>
      assertOnlyMemberStatusChanged(before, { ...after, [key]: [] }, 'Amy', false),
    ).toThrow();
  expect(() =>
    assertOnlyMemberStatusChanged(before, { ...after, trips: before.trips }, 'Amy', false),
  ).toThrow();
});

for (const status of ['停用', '啟用'])
  test(`T073 isolated status Then verifies ${status} history and API`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '午餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    if (status === '啟用') await deactivateSplittingMember(world, 'Amy');
    await changeCompanionStatus(world, { name: 'Amy', status });
    await runIsolatedStep(
      {
        phrase: memberStatusResultPhrase,
        input: { name: 'Amy', status },
        execute: assertCompanionStatus,
      },
      world,
    );
  });

test('T073 balances accept included or omitted zero rows while retaining inactive debt', () => {
  const before: SourceSnapshot = {
    trips: [{ id: 'trip' }],
    members: [{ id: 'Alice' }, { id: 'Amy', is_active: true }, { id: 'Carol' }],
    expenses: [
      {
        id: 'expense',
        payer_member_id: 'Alice',
        amount_minor: '100',
        currency_code: 'JPY',
        minor_unit: 0,
      },
    ],
    shares: [{ expense_id: 'expense', member_id: 'Amy' }],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const after = {
    ...before,
    members: before.members.map((row) => (row.id === 'Amy' ? { ...row, is_active: false } : row)),
  };
  const balances = [
    {
      memberId: 'Alice',
      currencyCode: 'JPY',
      netAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
    },
    {
      memberId: 'Amy',
      currencyCode: 'JPY',
      netAmount: { numerator: '-100', denominator: '1', minorUnit: 0 },
    },
  ];
  const zero = {
    memberId: 'Carol',
    currencyCode: 'JPY',
    netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
  };
  expect(() => assertStatusBalances(before, after, balances)).not.toThrow();
  expect(() => assertStatusBalances(before, after, [...balances, zero])).not.toThrow();
  expect(() => assertStatusBalances(before, after, balances.slice(0, 1))).toThrow();
  expect(() => assertStatusBalances(before, after, [...balances, zero, zero])).toThrow();
  expect(() =>
    assertStatusBalances(before, after, [...balances, { ...zero, memberId: 'foreign' }]),
  ).toThrow();
  expect(() =>
    assertStatusBalances(before, after, [...balances, { ...zero, currencyCode: 'TWD' }]),
  ).toThrow();
  expect(() =>
    assertStatusBalances(before, after, [
      { ...balances[0]!, netAmount: zero.netAmount },
      balances[1]!,
    ]),
  ).toThrow();
  expect(() => assertStatusBalances(before, { ...after, shares: [] }, balances)).toThrow();
});
