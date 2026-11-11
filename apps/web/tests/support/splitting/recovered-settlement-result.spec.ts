import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { openBrowserSettlementForm } from './settlement-form.js';
import {
  arrangeLostSettlementResponse,
  lostSettlementResponseKey,
  type LostSettlementResponseState,
} from './lost-settlement-response.js';
import { saveBrowserSettlement, type BrowserSettlementSave } from './save-settlement.js';
import {
  assertRecoveredSettlementEvidence,
  assertRecoveredSettlementScreen,
  recoveredSettlementPhrase,
} from './recovered-settlement-result.js';

test('T216 requires original two IDs and browser verification without accepting duplicate writes', () => {
  const draft = {
    id: 'original',
    repaymentId: 'original-payment',
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
    command,
    before,
    ids: {
      commandId: draft.id,
      repaymentId: draft.repaymentId,
      mutationIds: [draft.id],
      lookupIds: [draft.id],
    },
    mutations: writes,
    lookups: [{ id: draft.id, actualStatus: 200, browserStatus: 200 }],
    mutationFinished: Promise.resolve(),
    availability: 'available',
    authoritativeAfter: after,
    savedResponse: { id: draft.id, repayment: { id: draft.repaymentId } },
  };
  const check = (a = action, l = loss, w = writes) =>
    assertRecoveredSettlementEvidence(a, l, w, 'trip');
  expect(recoveredSettlementPhrase).toBe('畫面查證原結清成功且不重複記錄');
  expect(() => check()).not.toThrow();
  expect(() => check({ ...action, outcome: 'recovered' })).not.toThrow();
  expect(() => check({ ...action, outcome: 'saved' })).toThrow();
  expect(() => check({ ...action, command: { ...command, repaymentId: 'new-payment' } })).toThrow();
  expect(() => check(action, { ...loss, lookups: [] })).toThrow();
  expect(() =>
    check(action, { ...loss, lookups: [{ id: draft.id, actualStatus: 200, browserStatus: 404 }] }),
  ).toThrow();
  expect(() =>
    check(action, {
      ...loss,
      lookups: [{ id: 'replacement', actualStatus: 200, browserStatus: 200 }],
    }),
  ).toThrow();
  expect(() => check(action, { ...loss, mutations: [...writes, ...writes] })).toThrow();
  expect(() => check(action, loss, [...writes, ...writes])).toThrow();
  expect(() => check(action, { ...loss, authoritativeAfter: undefined })).toThrow();
  expect(() =>
    check(action, { ...loss, savedResponse: { id: draft.id, repayment: { id: 'replacement' } } }),
  ).toThrow();
});

test('T216 isolated real product recovers the original settlement without recording twice', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await openBrowserSettlementForm(page, world, 'Amy');
  await arrangeLostSettlementResponse(page, world, 'available');
  try {
    await saveBrowserSettlement(page, world, '33');
    await runIsolatedStep(
      {
        phrase: recoveredSettlementPhrase,
        input: undefined,
        execute: (context) => assertRecoveredSettlementScreen(page, context),
      },
      world,
    );
  } finally {
    await world.get<LostSettlementResponseState>(lostSettlementResponseKey).interceptor?.restore();
  }
});
