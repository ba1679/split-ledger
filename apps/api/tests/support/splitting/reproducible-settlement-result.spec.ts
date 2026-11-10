import { test, expect } from '../fixtures.js';
import {
  assertReproducibleSettlement,
  assertSameSettlementProjection,
  reproducibleSettlementPhrase,
  type DeterministicSettlementView,
} from './reproducible-settlement-result.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSimplificationMode } from './simplification-mode-fixture.js';
import { readTripSettlement } from './read-settlement-command.js';
import { runIsolatedStep } from './harness.js';

const projection = (): DeterministicSettlementView => ({
  accountingRevision: '2',
  simplifyDebts: true,
  balances: [
    {
      memberId: 'Alice',
      currencyCode: 'JPY',
      netAmount: { numerator: '-60', denominator: '1', minorUnit: 0 },
    },
    {
      memberId: 'Carol',
      currencyCode: 'JPY',
      netAmount: { numerator: '60', denominator: '1', minorUnit: 0 },
    },
  ],
  arrangements: [
    {
      key: 'opaque-current-key',
      debtorMemberId: 'Alice',
      creditorMemberId: 'Carol',
      currencyCode: 'JPY',
      amount: { numerator: '60', denominator: '1', minorUnit: 0 },
    },
  ],
  explanation: 'Alice 付款給 Carol。付款由兩筆減為一筆。淨額與原始紀錄維持不變。',
  directArrangementCount: 2,
  suggestedArrangementCount: 1,
});

test('T088 registers a parameter-free Then and rejects every unstable projection field', () => {
  expect(reproducibleSettlementPhrase).toBe('相同資料的結算安排可重現');
  const original = projection();
  expect(() => assertSameSettlementProjection(structuredClone(original), original)).not.toThrow();
  const changes: ((view: DeterministicSettlementView) => void)[] = [
    (view) => {
      view.accountingRevision = '3';
    },
    (view) => {
      view.simplifyDebts = false;
    },
    (view) => {
      view.balances.reverse();
    },
    (view) => {
      view.balances[0]!.netAmount = { ...view.balances[0]!.netAmount, numerator: '-59' };
    },
    (view) => {
      view.arrangements[0]!.key = 'different-key';
    },
    (view) => {
      view.arrangements[0]!.creditorMemberId = 'Bob';
    },
    (view) => {
      view.arrangements[0]!.amount = { ...view.arrangements[0]!.amount, numerator: '59' };
    },
    (view) => {
      view.explanation = '改變的說明';
    },
    (view) => {
      view.directArrangementCount = 3;
    },
    (view) => {
      view.suggestedArrangementCount = 0;
    },
  ];
  for (const change of changes) {
    const changed = structuredClone(original);
    change(changed);
    expect(() => assertSameSettlementProjection(changed, original)).toThrow();
  }
  const twoEdges = projection();
  twoEdges.arrangements.push({
    ...twoEdges.arrangements[0]!,
    key: 'second-key',
    debtorMemberId: 'Bob',
  });
  twoEdges.directArrangementCount = 2;
  twoEdges.suggestedArrangementCount = 2;
  const reordered = structuredClone(twoEdges);
  reordered.arrangements.reverse();
  expect(() => assertSameSettlementProjection(reordered, twoEdges)).toThrow();
});

test('T088 isolated Then compares ten real read-only GETs to the single Act', async ({ world }) => {
  await seedSplittingExpenses(world, [
    { 項目: 'Alice車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: 'Bob門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await seedSimplificationMode(world, '開啟');
  await readTripSettlement(world);
  await runIsolatedStep(
    {
      phrase: reproducibleSettlementPhrase,
      input: undefined,
      execute: assertReproducibleSettlement,
    },
    world,
  );
});
