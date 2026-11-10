import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { openBrowserSettlementForm, type BrowserSettlementDraft } from './settlement-form.js';
import { changeSnackOnAnotherDevice } from './stale-settlement-form.js';
import { saveBrowserSettlement, type BrowserSettlementSave } from './save-settlement.js';
import {
  assertStaleSettlementAuthority,
  assertStaleSettlementRejected,
} from './stale-settlement-rejected-result.js';

// Independent adversarial evidence: the old command is 100/3, current authority is 200/3.
test('T214: reject old-key retries, success, stale baselines and any new accounting fact', () => {
  const draft: BrowserSettlementDraft = {
    id: 'settlement-id',
    repaymentId: 'repayment-id',
    arrangementKey: 'old-key',
    accountingRevision: '3',
    debtorMemberId: 'amy',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
    paidOn: '2027-03-12',
  };
  const corrected: BrowserSplittingSnapshot = {
    sources: {
      trips: [],
      members: [],
      expenses: [{ id: 'snack', amount_minor: '200' }],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    repayments: { items: [] },
    totals: { totals: [] },
    settlement: {
      accountingRevision: '4',
      simplifyDebts: false,
      balances: [],
      arrangements: [
        {
          key: 'new-key',
          debtorMemberId: 'amy',
          creditorMemberId: 'alice',
          currencyCode: 'JPY',
          amount: { numerator: '200', denominator: '3', minorUnit: 0 },
        },
      ],
    },
  };
  const command = { ...draft, paidAmount: '33' };
  const saved: BrowserSettlementSave = {
    outcome: 'rejected',
    command,
    payload: command,
    status: 409,
    response: { code: 'ACCOUNTING_REVISION_CONFLICT' },
    before: corrected,
    after: corrected,
  };
  const write = { method: 'POST', path: '/api/trips/trip-id/settlements', body: command };
  const verify = (action = saved, current = corrected, writes = [write]) =>
    assertStaleSettlementAuthority(draft, corrected, action, current, writes, 'trip-id');
  verify();
  verify({ ...saved, response: { code: 'ARRANGEMENT_NOT_FOUND' } });
  for (const action of [
    { ...saved, outcome: 'saved' as const },
    { ...saved, status: 500 },
    { ...saved, response: { code: 'VALIDATION_ERROR' } },
    { ...saved, payload: { ...command, arrangementKey: 'new-key' } },
    {
      ...saved,
      before: { ...corrected, settlement: { ...corrected.settlement, accountingRevision: '3' } },
    },
  ])
    expect(() => verify(action)).toThrow();
  expect(() => verify(saved, corrected, [write, write])).toThrow();
  expect(() =>
    verify(saved, { ...corrected, settlement: { ...corrected.settlement, arrangements: [] } }),
  ).toThrow();
  for (const key of ['expenses', 'repayments', 'settlements', 'adjustments'] as const) {
    const changed = structuredClone(corrected);
    changed.sources = { ...changed.sources, [key]: [{ id: 'unexpected-write' }] };
    expect(() => verify(saved, changed)).toThrow();
  }
});

test('T214: real stale settlement rejects original command and offers a read-only refresh', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  await changeSnackOnAnotherDevice(page, world);
  await saveBrowserSettlement(page, world, '33');
  await assertStaleSettlementRejected(page, world);
});
