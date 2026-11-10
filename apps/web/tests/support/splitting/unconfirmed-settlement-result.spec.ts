import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { openBrowserSettlementForm } from './settlement-form.js';
import {
  arrangeLostSettlementResponse,
  type LostSettlementResponseState,
} from './lost-settlement-response.js';
import { saveBrowserSettlement, type BrowserSettlementSave } from './save-settlement.js';
import {
  assertUnconfirmedSettlement,
  assertUnconfirmedSettlementEvidence,
  unconfirmedSettlementPhrase,
} from './unconfirmed-settlement-result.js';

test('T215 distinguishes committed original settlement from temporary browser 404 and rejects replacement IDs or retries', () => {
  const draft = {
    id: 'original',
    repaymentId: 'original-repayment',
    arrangementKey: 'original-key',
    accountingRevision: '1',
    debtorMemberId: 'amy',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
    paidOn: '2027-03-12',
  };
  const command = { ...draft, paidAmount: '33' };
  const before = { marker: 'before' } as unknown as BrowserSplittingSnapshot;
  const after = { marker: 'after' } as unknown as BrowserSplittingSnapshot;
  const writes = [{ method: 'POST', path: '/api/trips/trip/settlements', body: command }];
  const action: BrowserSettlementSave = {
    outcome: 'unconfirmed',
    command,
    payload: command,
    status: null,
    response: null,
    before,
    after,
  };
  const loss: LostSettlementResponseState = {
    draft,
    before,
    ids: {
      commandId: draft.id,
      repaymentId: draft.repaymentId,
      mutationIds: [draft.id],
      lookupIds: [draft.id],
    },
    mutations: writes,
    lookups: [{ id: draft.id, actualStatus: 200, browserStatus: 404 }],
    mutationFinished: Promise.resolve(),
    availability: 'temporary-not-found',
    authoritativeAfter: after,
    savedResponse: { id: draft.id },
    command,
  };
  const check = (a = action, l = loss, w = writes) =>
    assertUnconfirmedSettlementEvidence(a, l, w, 'trip');
  expect(unconfirmedSettlementPhrase).toBe('畫面保留實付草稿並提示結清結果尚未確認');
  expect(() => check()).not.toThrow();
  for (const outcome of ['saved', 'recovered', 'rejected'] as const)
    expect(() => check({ ...action, outcome })).toThrow();
  for (const change of [
    { id: 'replacement' },
    { repaymentId: 'replacement' },
    { paidAmount: '34' },
    { paidOn: '2027-03-13' },
    { arrangementKey: 'new' },
    { accountingRevision: '2' },
    { expectedAmount: { numerator: '3333', denominator: '100', minorUnit: 0 } },
  ])
    expect(() => check({ ...action, command: { ...command, ...change } })).toThrow();
  expect(() => check(action, { ...loss, mutations: [...writes, ...writes] })).toThrow();
  expect(() => check(action, { ...loss, lookups: [] })).toThrow();
  expect(() =>
    check(action, { ...loss, lookups: [{ id: draft.id, actualStatus: 404, browserStatus: 404 }] }),
  ).toThrow();
  expect(() => check(action, { ...loss, authoritativeAfter: undefined })).toThrow();
  expect(() => check(action, loss, [...writes, ...writes])).toThrow();
  expect(() => check({ ...action, after: before })).toThrow();
});

test('T215 isolated actual product retains settlement draft after real commit and temporary verification 404', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  await arrangeLostSettlementResponse(page, world, 'temporary-not-found');
  await saveBrowserSettlement(page, world, '33');
  await runIsolatedStep(
    {
      phrase: unconfirmedSettlementPhrase,
      input: undefined,
      execute: (context) => assertUnconfirmedSettlement(page, context),
    },
    world,
  );
});
