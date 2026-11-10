import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { fillIndependentRepaymentDraft } from './repayment-draft.js';
import {
  arrangeLostRepaymentResponse,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';
import {
  saveIndependentRepayment,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';
import {
  assertUnconfirmedRepayment,
  assertUnconfirmedRepaymentEvidence,
  unconfirmedRepaymentPhrase,
} from './unconfirmed-repayment-result.js';

test('T196 distinguishes committed original UUID from temporary browser 404 without accepting retries', () => {
  const draft = {
    id: 'original',
    payerMemberId: 'amy',
    payeeMemberId: 'alice',
    amount: '400',
    currencyCode: 'JPY' as const,
    paidOn: '2027-03-12',
  };
  const before = { marker: 'before' } as unknown as BrowserSplittingSnapshot;
  const after = { marker: 'after' } as unknown as BrowserSplittingSnapshot;
  const writes = [{ method: 'POST', path: '/api/trips/trip/repayments', body: draft }];
  const action: IndependentRepaymentSave = {
    outcome: 'unconfirmed',
    draft,
    payload: draft,
    status: null,
    response: null,
    before,
    after,
  };
  const loss: LostRepaymentResponseState = {
    draft,
    before,
    ids: {
      commandId: draft.id,
      repaymentId: draft.id,
      mutationIds: [draft.id],
      lookupIds: [draft.id],
    },
    mutations: writes,
    lookups: [{ id: draft.id, actualStatus: 200, browserStatus: 404 }],
    mutationFinished: Promise.resolve(),
    availability: 'temporary-not-found',
    authoritativeAfter: after,
    savedResponse: { id: draft.id },
  };
  const check = (a = action, l = loss, w = writes) =>
    assertUnconfirmedRepaymentEvidence(a, l, w, 'trip');
  expect(unconfirmedRepaymentPhrase).toBe('保留還款草稿與原識別並提示結果尚未確認');
  expect(() => check()).not.toThrow();
  expect(() => check({ ...action, outcome: 'saved' })).toThrow();
  expect(() => check({ ...action, draft: { ...draft, id: 'replacement' } })).toThrow();
  expect(() => check(action, { ...loss, mutations: [...writes, ...writes] })).toThrow();
  expect(() => check(action, { ...loss, lookups: [] })).toThrow();
  expect(() =>
    check(action, { ...loss, lookups: [{ id: draft.id, actualStatus: 404, browserStatus: 404 }] }),
  ).toThrow();
  expect(() => check(action, { ...loss, authoritativeAfter: undefined })).toThrow();
  expect(() => check(action, loss, [...writes, ...writes])).toThrow();
});

test('T196 isolated real product retains repayment draft when committed UUID lookup is temporarily 404', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await fillIndependentRepaymentDraft(page, world, 'Alice', '400');
  await arrangeLostRepaymentResponse(page, world, 'temporary-not-found');
  await saveIndependentRepayment(page, world);
  await runIsolatedStep(
    {
      phrase: unconfirmedRepaymentPhrase,
      input: undefined,
      execute: (context) => assertUnconfirmedRepayment(page, context),
    },
    world,
  );
});
