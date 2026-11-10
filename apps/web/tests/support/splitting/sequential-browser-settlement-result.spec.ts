import { test, expect } from '../fixtures.js';
import { assertExactlyZeroSnackView } from '../../../../api/tests/support/splitting/sequential-settlement-result.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { settleBrowserAmyArrangement } from './settled-arrangement-fixture.js';
import { openBrowserSettlementForm } from './settlement-form.js';
import { saveBrowserSettlement } from './save-settlement.js';
import {
  assertSequentialBrowserSettlement,
  sequentialBrowserSettlementPhrase,
} from './sequential-browser-settlement-result.js';

test('T207: a displayed zero cannot hide any positive or reverse rational tail', () => {
  expect(sequentialBrowserSettlementPhrase).toBe('三人已平衡且保留兩筆實付與原始份額');
  assertExactlyZeroSnackView({ arrangements: [], balances: [] }, ['alice', 'amy', 'bob']);
  for (const numerator of ['1', '-1'])
    expect(() =>
      assertExactlyZeroSnackView(
        {
          arrangements: [],
          balances: [
            {
              memberId: 'bob',
              currencyCode: 'JPY',
              netAmount: { numerator, denominator: '3000000', minorUnit: 0 },
            },
          ],
        },
        ['alice', 'amy', 'bob'],
      ),
    ).toThrow();
  expect(() =>
    assertExactlyZeroSnackView({ arrangements: [{}], balances: [] }, ['alice', 'amy', 'bob']),
  ).toThrow();
});

test('T207: real sequential settlement preserves Amy33 and Bob34 without rational remainder', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await settleBrowserAmyArrangement(world);
  await openBrowserSettlementForm(page, world, 'Bob');
  await saveBrowserSettlement(page, world, '34');
  await assertSequentialBrowserSettlement(page, world);
});
