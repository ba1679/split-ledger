import { test, expect } from '../fixtures.js';
import {
  assertChangedExplanationText,
  assertChangedExplanationProjection,
  assertSimplificationExplanation,
  simplificationExplanationPhrase,
} from './simplification-explanation-result.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { changeSimplificationMode } from './change-simplification-command.js';
import { runIsolatedStep } from './harness.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import type { SourceSnapshot } from './types.js';

const text =
  'Alice 現在直接付給 Carol，付款從兩筆減為一筆。各人的應收應付總額不變。原始紀錄保持不變。';
test('T098 accepts natural template variants and rejects misleading or empty explanations', () => {
  expect(simplificationExplanationPhrase).toBe('結算說明以三句內描述付款對象與筆數變化');
  for (const valid of [text, 'Alice 改付 Carol，2 筆合併為 1 筆；每人的淨額未變，原始帳目保留。'])
    expect(() => assertChangedExplanationText(valid)).not.toThrow();
  for (const invalid of [
    '',
    'Alice Bob Carol。兩筆變一筆。',
    text.replace('Alice 現在直接付給 Carol', 'Carol 付給 Alice'),
    text.replace('兩筆減為一筆', '一筆增加為兩筆'),
    text.replace('應收應付總額不變', '應收應付總額增加'),
    text.replace('原始紀錄保持不變', '原始紀錄已重寫'),
    `${text}公平。`,
    `${text}另一句。`,
  ])
    expect(() => assertChangedExplanationText(invalid)).toThrow();
});
test('T098 explanation must agree with source-only chain, amounts, counts and net balances', () => {
  const snapshot: SourceSnapshot = {
    trips: [{ accounting_revision: '2', simplify_debts: true }],
    members: ['Alice', 'Bob', 'Carol'].map((id) => ({ id })),
    expenses: [
      { id: 'a', payer_member_id: 'Bob', currency_code: 'JPY', amount_minor: '60', minor_unit: 0 },
      {
        id: 'b',
        payer_member_id: 'Carol',
        currency_code: 'JPY',
        amount_minor: '60',
        minor_unit: 0,
      },
    ],
    shares: [
      { expense_id: 'a', member_id: 'Alice' },
      { expense_id: 'b', member_id: 'Bob' },
    ],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const view = {
    accountingRevision: '2',
    simplifyDebts: true,
    directArrangementCount: 2,
    suggestedArrangementCount: 1,
    balances: snapshotExactBalances(snapshot).map(({ amount, ...row }) => ({
      ...row,
      netAmount: amount,
    })),
    arrangements: [
      {
        key: 'opaque',
        debtorMemberId: 'Alice',
        creditorMemberId: 'Carol',
        currencyCode: 'JPY',
        amount: { numerator: '60', denominator: '1', minorUnit: 0 },
      },
    ],
    explanation: text,
  };
  const ids = { alice: 'Alice', bob: 'Bob', carol: 'Carol' };
  expect(() => assertChangedExplanationProjection(snapshot, view, ids)).not.toThrow();
  for (const bad of [
    { ...view, directArrangementCount: 3 },
    { ...view, arrangements: [{ ...view.arrangements[0]!, creditorMemberId: 'Bob' }] },
    {
      ...view,
      balances: view.balances.map((row) => ({
        ...row,
        netAmount: { ...row.netAmount, numerator: '0' },
      })),
    },
  ])
    expect(() => assertChangedExplanationProjection(snapshot, bad, ids)).toThrow();
});
test('T098 isolated Then reads explanation and proves unchanged source facts', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: 'Alice車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: 'Bob門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await changeSimplificationMode(world, '開啟');
  await runIsolatedStep(
    {
      phrase: simplificationExplanationPhrase,
      input: undefined,
      execute: assertSimplificationExplanation,
    },
    world,
  );
});
