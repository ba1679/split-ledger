import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { seedSplittingExpenses, independentSplittingOracle } from './expense-fixture.js';
import { parseRepaymentFixtureRows, seedSplittingRepayments } from './repayments-fixture.js';
import type { SourceSnapshot } from './types.js';

const rows = [
  { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-19' },
  { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '600', 日期: '2027-01-20' },
];

test('T008: DataTable preserves each payment and date as strings', () => {
  expect(parseRepaymentFixtureRows(rows)).toEqual([
    { payer: 'Amy', payee: 'Alice', currencyCode: 'JPY', amount: '400', paidOn: '2027-01-19' },
    { payer: 'Amy', payee: 'Alice', currencyCode: 'JPY', amount: '600', paidOn: '2027-01-20' },
  ]);
  expect(() => parseRepaymentFixtureRows([{ ...rows[0], 金額: '0' }])).toThrow();
  expect(() => parseRepaymentFixtureRows([{ ...rows[0], 日期: '2027-02-29' }])).toThrow();
  expect(() => parseRepaymentFixtureRows([{ ...rows[0], 收款人: 'Amy' }])).toThrow();
});

test('T008: isolated repayment Given appends independent facts to existing travel', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  const tripId = world.get<string>('splitting:tripId');

  await runIsolatedStep(
    { phrase: 'owner 的分帳旅行已有下列獨立還款：', input: rows, execute: seedSplittingRepayments },
    world,
  );

  expect(world.get('splitting:tripId')).toBe(tripId);
  expect(world.get<string[]>('splitting:repaymentIds')).toHaveLength(2);
  const snapshot = world.get<SourceSnapshot>('splitting:sourceSnapshot');

  expect(snapshot.repayments).toHaveLength(2);
  expect(snapshot.settlements).toEqual([]);
  expect(snapshot.adjustments).toEqual([]);
  for (const memberId of world.splitting.ids.members.values())
    expect(independentSplittingOracle.balance(snapshot, memberId, 'JPY').numerator).toBe('0');
});
