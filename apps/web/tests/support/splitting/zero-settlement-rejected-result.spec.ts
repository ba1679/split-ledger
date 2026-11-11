import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { openBrowserSettlementForm, type BrowserSettlementDraft } from './settlement-form.js';
import { saveBrowserSettlement, type BrowserSettlementSave } from './save-settlement.js';
import {
  assertZeroSettlementAuthority,
  assertZeroSettlementRejected,
} from './zero-settlement-rejected-result.js';

test('T212: zero validation must preserve the exact key, fraction, history and revision', () => {
  const draft: BrowserSettlementDraft = {
    id: 'settlement-id',
    repaymentId: 'repayment-id',
    arrangementKey: 'original-key',
    accountingRevision: '3',
    debtorMemberId: 'amy',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
    paidOn: '2027-03-12',
  };
  const before: BrowserSplittingSnapshot = {
    sources: {
      trips: [],
      members: [],
      expenses: [],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    settlement: {
      accountingRevision: '3',
      simplifyDebts: false,
      balances: [],
      arrangements: [
        {
          key: draft.arrangementKey,
          debtorMemberId: 'amy',
          creditorMemberId: 'alice',
          currencyCode: 'JPY',
          amount: draft.expectedAmount,
        },
      ],
    },
    repayments: { items: [] },
    totals: { totals: [] },
  };
  const saved: BrowserSettlementSave = {
    outcome: 'local-validation',
    command: { ...draft, paidAmount: '0' },
    payload: null,
    status: null,
    response: null,
    before,
    after: before,
  };
  assertZeroSettlementAuthority(draft, saved, structuredClone(before));
  assertZeroSettlementAuthority(draft, { ...saved, outcome: 'rejected', status: 422 }, before);
  for (const key of ['repayments', 'settlements', 'adjustments'] as const) {
    const changed = structuredClone(before);
    changed.sources = { ...changed.sources, [key]: [{ id: 'unexpected-saved-record' }] };
    expect(() => assertZeroSettlementAuthority(draft, saved, changed)).toThrow();
  }
  for (const changed of [
    { ...before, settlement: { ...before.settlement, arrangements: [] } },
    { ...before, settlement: { ...before.settlement, accountingRevision: '4' } },
  ])
    expect(() => assertZeroSettlementAuthority(draft, saved, changed)).toThrow();
  for (const outcome of ['saved', 'unconfirmed', 'recovered'] as const)
    expect(() => assertZeroSettlementAuthority(draft, { ...saved, outcome }, before)).toThrow();
  expect(() =>
    assertZeroSettlementAuthority(draft, { ...saved, outcome: 'rejected', status: 500 }, before),
  ).toThrow();
});

test('T212: real zero payment retains its draft and exact outstanding arrangement', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  await saveBrowserSettlement(page, world, '0');
  await assertZeroSettlementRejected(page, world);
});
