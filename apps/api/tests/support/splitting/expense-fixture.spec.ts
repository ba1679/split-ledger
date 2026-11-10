import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  fixtureMinorAmount,
  independentSplittingOracle,
  seedSplittingExpenses,
} from './expense-fixture.js';
import { splittingMemberId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

const phrase = 'owner 的分帳旅行已有下列支出：';

test('T007: isolated expense Given persists payer, exact source and participant set', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase,
      input: [
        { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
      ],
      execute: seedSplittingExpenses,
    },
    world,
  );
  const snapshot = world.get<SourceSnapshot>('splitting:expenseSources');
  const id = world.splitting.ids.expenses.get('點心')!;
  expect(snapshot.expenses).toHaveLength(1);
  for (const name of ['Alice', 'Amy', 'Bob'])
    expect(independentSplittingOracle.share(snapshot, id, splittingMemberId(world, name))).toEqual({
      numerator: '100',
      denominator: '3',
      minorUnit: 0,
    });
  expect(
    independentSplittingOracle.balance(snapshot, splittingMemberId(world, 'Alice'), 'JPY'),
  ).toEqual({ numerator: '200', denominator: '3', minorUnit: 0 });
});

test('T007: independent BigInt oracle handles scales, settlement facts, and fractional shares', async () => {
  expect(fixtureMinorAmount('92233720368547758.07', 2)).toBe(9223372036854775807n);
  const snapshot: SourceSnapshot = {
    trips: [],
    members: [],
    settlements: [],
    expenses: [
      { id: 'e', payer_member_id: 'a', amount_minor: '100', currency_code: 'JPY', minor_unit: 0 },
    ],
    shares: ['a', 'b', 'c'].map((member_id) => ({ expense_id: 'e', member_id })),
    repayments: [
      {
        payer_member_id: 'b',
        payee_member_id: 'a',
        amount_minor: '3300',
        currency_code: 'JPY',
        minor_unit: 2,
      },
    ],
    adjustments: [
      { member_id: 'b', currency_code: 'JPY', numerator: '1', denominator: '3', minor_unit: 0 },
      { member_id: 'a', currency_code: 'JPY', numerator: '-1', denominator: '3', minor_unit: 0 },
    ],
  };
  expect(independentSplittingOracle.balance(snapshot, 'b', 'JPY')).toEqual({
    numerator: '0',
    denominator: '1',
    minorUnit: 2,
  });
  expect(independentSplittingOracle.balance(snapshot, 'a', 'JPY')).toEqual({
    numerator: '10000',
    denominator: '3',
    minorUnit: 2,
  });
  expect(independentSplittingOracle.balance(snapshot, 'c', 'JPY')).toEqual({
    numerator: '-10000',
    denominator: '3',
    minorUnit: 2,
  });
  expect(independentSplittingOracle.balance(snapshot, 'a', 'TWD')).toEqual({
    numerator: '0',
    denominator: '1',
    minorUnit: 0,
  });
  expect(
    independentSplittingOracle.equal(
      { numerator: '100', denominator: '3', minorUnit: 0 },
      { numerator: '10000', denominator: '3', minorUnit: 2 },
    ),
  ).toBe(true);
});
