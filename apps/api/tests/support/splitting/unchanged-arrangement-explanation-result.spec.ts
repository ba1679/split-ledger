import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { changeSimplificationMode } from './change-simplification-command.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import {
  assertUnchangedArrangementExplanation,
  assertUnchangedArrangementProjection,
  unchangedArrangementExplanationPhrase,
} from './unchanged-arrangement-explanation-result.js';
import type { SourceSnapshot } from './types.js';
import type { CountSettlementView } from './simplification-count-result.js';

test('T099 equivalent no-change explanations must match the source payment and nets', () => {
  expect(unchangedArrangementExplanationPhrase).toBe('結算說明指出付款安排無需調整');
  const snapshot: SourceSnapshot = {
    trips: [{ accounting_revision: '1', simplify_debts: true }],
    members: [{ id: 'alice' }, { id: 'amy' }],
    expenses: [
      {
        id: 'lunch',
        payer_member_id: 'alice',
        currency_code: 'JPY',
        amount_minor: '500',
        minor_unit: 0,
      },
    ],
    shares: [{ expense_id: 'lunch', member_id: 'amy' }],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const view: CountSettlementView & { explanation: string } = {
    accountingRevision: '1',
    simplifyDebts: true,
    directArrangementCount: 1,
    suggestedArrangementCount: 1,
    explanation: '目前付款安排無需調整。',
    arrangements: [
      {
        key: 'current',
        debtorMemberId: 'amy',
        creditorMemberId: 'alice',
        currencyCode: 'JPY',
        amount: { numerator: '500', denominator: '1', minorUnit: 0 },
      },
    ],
    balances: snapshotExactBalances(snapshot).map(({ amount, ...row }) => ({
      ...row,
      netAmount: amount,
    })),
  };
  for (const explanation of [
    '目前付款安排無需調整。',
    '付款安排不用更動，維持目前的一筆付款即可。',
  ])
    expect(() =>
      assertUnchangedArrangementProjection(snapshot, { ...view, explanation }, 'amy', 'alice'),
    ).not.toThrow();
  for (const explanation of [
    '',
    '已減少一筆付款。',
    '付款安排需要調整。',
    '目前付款安排無需調整。無需付款。',
    '付款安排無需調整。第一句。第二句。第四句。',
    '付款安排無需調整，確保公平。',
  ])
    expect(() =>
      assertUnchangedArrangementProjection(snapshot, { ...view, explanation }, 'amy', 'alice'),
    ).toThrow();
  for (const bad of [
    { ...view, arrangements: [] },
    { ...view, suggestedArrangementCount: 0 },
    { ...view, balances: [] },
    {
      ...view,
      arrangements: [
        { ...view.arrangements[0]!, amount: { numerator: '499', denominator: '1', minorUnit: 0 } },
      ],
    },
  ])
    expect(() => assertUnchangedArrangementProjection(snapshot, bad, 'amy', 'alice')).toThrow();
});

test('T099 isolated Then reads real unchanged single-payment explanation', async ({ world }) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '500', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await changeSimplificationMode(world, '開啟');
  await runIsolatedStep(
    {
      phrase: unchangedArrangementExplanationPhrase,
      input: undefined,
      execute: assertUnchangedArrangementExplanation,
    },
    world,
  );
});
