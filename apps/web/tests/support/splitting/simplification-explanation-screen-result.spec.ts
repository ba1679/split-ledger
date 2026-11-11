import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openDirectSettlementScreen } from './direct-settlement-screen.js';
import { toggleSimplification } from './toggle-simplification.js';
import {
  assertSimplificationExplanationScreen,
  assertSimplificationExplanationScreenText,
} from './simplification-explanation-screen-result.js';

const explanation =
  '原本 Alice 付 Bob、Bob 付 Carol，現在 Alice 直接付 Carol，兩筆變一筆。每人淨額不變，原始支出與還款紀錄保持不變。';
test('T208: explanation requires original edges, new destination, counts, and unchanged records', () => {
  assertSimplificationExplanationScreenText(explanation);
  for (const invalid of [
    explanation.replace('Alice 付 Bob', 'Alice 與 Bob'),
    explanation.replace('Bob 付 Carol', 'Bob 與 Carol'),
    explanation.replace('Alice 直接付 Carol', 'Carol 直接付 Alice'),
    explanation.replace('兩筆變一筆', '付款安排已更新'),
    explanation.replace('還款', ''),
    explanation.replace('淨額不變', '淨額調整'),
    `${explanation}已更新。請查看。`,
    `${explanation}改道`,
    `${explanation}Simplify Debts`,
  ])
    expect(() => assertSimplificationExplanationScreenText(invalid)).toThrow();
});

test('T208: real simplified screen explains its authoritative two-to-one graph without changing sources', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await openDirectSettlementScreen(page, world);
  await toggleSimplification(page, world, true);
  await assertSimplificationExplanationScreen(page, world);
});
