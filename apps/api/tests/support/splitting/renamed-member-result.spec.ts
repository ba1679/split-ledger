import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { renameCompanion } from './rename-member-command.js';
import {
  assertRenamedMember,
  assertRenameBalances,
  assertRenameSourceIntegrity,
  renamedMemberResultPhrase,
} from './renamed-member-result.js';
import type { SourceSnapshot } from './types.js';

test('T074 binds the name and rejects identity or historical-reference changes', () => {
  expect(renamedMemberResultPhrase).toBe('改名後 {string} 仍沿用原成員身分');
  expect(renamedMemberResultPhrase.match(/\{string\}/g)).toHaveLength(1);
  const before: SourceSnapshot = {
    trips: [],
    members: [
      {
        id: 'Amy',
        trip_id: 'trip',
        role: 'companion',
        name: 'Amy',
        name_key: 'amy',
        updated_at: 'old',
      },
    ],
    expenses: [{ payer_member_id: 'Amy' }],
    shares: [{ member_id: 'Amy' }],
    repayments: [{ from_member_id: 'Amy', to_member_id: 'Alice' }],
    settlements: [{ debtor_member_id: 'Amy' }],
    adjustments: [{ member_id: 'Amy' }],
  };
  const after = {
    ...before,
    members: [{ ...before.members[0], name: '小美', name_key: '小美', updated_at: 'new' }],
  };
  expect(() => assertRenameSourceIntegrity(before, after, 'Amy', '小美')).not.toThrow();
  expect(() => assertRenameSourceIntegrity(before, before, 'Amy', '小美')).toThrow();
  expect(() =>
    assertRenameSourceIntegrity(
      before,
      { ...after, members: [{ ...after.members[0], id: 'new' }] },
      'Amy',
      '小美',
    ),
  ).toThrow();
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(() =>
      assertRenameSourceIntegrity(before, { ...after, [key]: [] }, 'Amy', '小美'),
    ).toThrow();
});

test('T074 isolated rename Then rereads stable identity, expense resolution and exact balances', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await seedSplittingRepayments(world, [
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '40', 日期: '2027-01-20' },
  ]);
  await renameCompanion(world, ['Amy', '小美']);
  await runIsolatedStep(
    { phrase: renamedMemberResultPhrase, input: '小美', execute: assertRenamedMember },
    world,
  );
});

test('T074 accepts omitted or included zero balances and rejects malformed balance projections', () => {
  const before: SourceSnapshot = {
    trips: [],
    members: [{ id: 'Alice' }, { id: 'Amy' }, { id: 'Bob' }, { id: 'Carol' }],
    expenses: [
      {
        id: 'expense',
        currency_code: 'JPY',
        minor_unit: 0,
        amount_minor: '100',
        payer_member_id: 'Alice',
      },
    ],
    shares: [{ expense_id: 'expense', member_id: 'Amy' }],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const amount = (numerator: string) => ({ numerator, denominator: '1', minorUnit: 0 });
  const nonzero = [
    { memberId: 'Alice', currencyCode: 'JPY', netAmount: amount('100') },
    { memberId: 'Amy', currencyCode: 'JPY', netAmount: amount('-100') },
  ];
  const zero = { memberId: 'Bob', currencyCode: 'JPY', netAmount: amount('0') };
  expect(() => assertRenameBalances(before, nonzero)).not.toThrow();
  expect(() =>
    assertRenameBalances(before, [...nonzero, zero, { ...zero, memberId: 'Carol' }]),
  ).not.toThrow();
  expect(() => assertRenameBalances(before, [])).toThrow();
  expect(() => assertRenameBalances(before, [...nonzero, zero, zero])).toThrow();
  expect(() =>
    assertRenameBalances(before, [...nonzero, { ...zero, memberId: 'outsider' }]),
  ).toThrow();
  expect(() =>
    assertRenameBalances(before, [...nonzero, { ...zero, currencyCode: 'USD' }]),
  ).toThrow();
  expect(() =>
    assertRenameBalances(before, [...nonzero, { ...zero, netAmount: amount('1') }]),
  ).toThrow();
});
