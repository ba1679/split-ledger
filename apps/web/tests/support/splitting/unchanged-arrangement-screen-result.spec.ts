import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openDirectSettlementScreen } from './direct-settlement-screen.js';
import { toggleSimplification } from './toggle-simplification.js';
import {
  assertUnchangedArrangementScreen,
  assertUnchangedArrangementScreenText,
  unchangedArrangementScreenPhrase,
} from './unchanged-arrangement-screen-result.js';

test('T209: unchanged copy is neutral, short and does not claim no payment is due', () => {
  expect(unchangedArrangementScreenPhrase).toBe(
    '仍為 Amy 支付 Alice JPY 500 並提示目前的付款安排已無需調整',
  );
  const explanation = '目前的付款安排已無需調整。Amy 支付 Alice JPY 500。';
  assertUnchangedArrangementScreenText(explanation);
  for (const invalid of [
    '付款安排已更新。',
    `${explanation}已保存。請查看。`,
    ...['改道', '精確', '公平', 'Simplify Debts', '無需付款', '不用再付款'].map(
      (text) => `${explanation}${text}。`,
    ),
  ])
    expect(() => assertUnchangedArrangementScreenText(invalid)).toThrow();
});

test('T209: real simplified screen preserves its only Amy to Alice JPY 500 payment', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '500', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await openDirectSettlementScreen(page, world);
  await toggleSimplification(page, world, true);
  await assertUnchangedArrangementScreen(page, world);
});
