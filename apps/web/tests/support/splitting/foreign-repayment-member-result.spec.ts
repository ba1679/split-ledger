import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { seedOtherTripCarol } from './other-trip-carol-fixture.js';
import { openIndependentRepaymentMembers } from './open-independent-repayment-members.js';
import {
  assertCurrentTripRepaymentChoices,
  assertForeignRepaymentMemberUnavailable,
} from './foreign-repayment-member-result.js';

test('T200: both real repayment controls exclude the foreign member and preserve both ledgers', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedOtherTripCarol(world);
  await openIndependentRepaymentMembers(page, world);
  await assertForeignRepaymentMemberUnavailable(page, world);
});

test('T200: full option oracle rejects foreign, hidden, relabelled and missing current members', () => {
  const choices = [
    { id: '', name: '請選擇', disabled: false, selected: true },
    { id: 'alice', name: 'Alice', disabled: false, selected: false },
    { id: 'amy', name: 'Amy', disabled: false, selected: false },
  ];
  const check = (actual: typeof choices) =>
    assertCurrentTripRepaymentChoices(actual, 'carol', ['alice', 'amy']);
  check(choices);
  for (const extra of [
    { id: 'carol', name: 'Carol', disabled: false, selected: false },
    { id: 'carol', name: '同行者', disabled: true, selected: false },
    { id: 'unknown', name: 'Carol', disabled: true, selected: false },
  ])
    expect(() => check([...choices, extra])).toThrow();
  expect(() => check(choices.slice(0, 2))).toThrow();
  expect(() => check([...choices, choices[1]!])).toThrow();
  expect(() =>
    check(choices.map((choice) => ({ ...choice, disabled: choice.id === 'amy' }))),
  ).toThrow();
});
