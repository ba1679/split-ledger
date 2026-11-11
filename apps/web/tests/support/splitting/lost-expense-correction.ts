import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { amountInput } from '../expense-helpers.js';
import { SharedExpenseForm, type SharedExpenseDraft } from './expense-draft.js';
import {
  seedBrowserSplittingExpenses,
  readBrowserSplittingSnapshot,
  browserSplittingStateKey,
  type BrowserSplittingSnapshot,
  type BrowserExpense,
} from './fixture.js';
import type { LostResponseInterceptor, StableCommandIds } from './types.js';

export const lostExpenseCorrectionPhrase =
  '共同支出晚餐修改已填 JPY 200 且保存回應遺失與查證暫不可用';

export const lostExpenseCorrectionKey = 'splitting:lostExpenseCorrection';

export interface LostExpenseCorrectionState {
  readonly expenseId: string;
  readonly tripId: string;
  readonly before: BrowserSplittingSnapshot;
  readonly draft: SharedExpenseDraft;
  readonly ids: StableCommandIds;
  readonly mutations: { method: string; path: string; body: Record<string, unknown> }[];
  readonly lookups: string[];
  readonly blockedProjectionReads: string[];
  verificationAvailable: boolean;
  authoritativeAfter?: BrowserSplittingSnapshot;
  interceptor?: LostResponseInterceptor;
}

/** Check the actual PATCH without prescribing optional unchanged form fields. */
export function assertDinnerCorrectionPayload(
  body: Record<string, unknown>,
  draft: SharedExpenseDraft,
): void {
  expect(body.amount, 'The one PATCH must carry the retained JPY 200 draft').toBe('200');
  if ('item' in body) expect(body.item).toBe(draft.item);
  if ('currencyCode' in body) expect(body.currencyCode).toBe(draft.currencyCode);
  if ('payerMemberId' in body) expect(body.payerMemberId).toBe(draft.payerMemberId);
  if ('shareMemberIds' in body)
    expect([...(body.shareMemberIds as string[])].sort()).toEqual([...draft.shareMemberIds].sort());
  if ('spentOn' in body) expect(body.spentOn).toBe(draft.spentOn);
  if ('categoryId' in body) expect(body.categoryId).toBeNull();
}

/** Modification may refresh updatedAt; all other non-share fields remain the original facts. */
export function assertSavedDinnerCorrection(before: BrowserExpense, after: BrowserExpense): void {
  const { updatedAt: originalUpdatedAt, ...originalFacts } = before as BrowserExpense & {
    updatedAt: string;
  };
  const { updatedAt, ...savedFacts } = after as BrowserExpense & { updatedAt: string };
  expect(originalUpdatedAt).toEqual(expect.any(String));
  expect(updatedAt).toEqual(expect.any(String));
  expect(
    Number.isFinite(Date.parse(updatedAt)),
    'Updated expense timestamp must remain valid',
  ).toBe(true);
  expect(savedFacts).toEqual({
    ...originalFacts,
    amount: '200',
    shares: expect.any(Array) as typeof before.shares,
  });
}

export async function arrangeLostExpenseCorrection(page: Page, world: LedgerWorld): Promise<void> {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  const before = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  const expense = before.expenses.items.find((row) => row.item === '晚餐')!;
  expect(expense, 'Fixture must contain the original dinner').toBeDefined();
  const tripId = splittingTripId(world);
  const path = `/api/trips/${tripId}/expenses/${expense.id}`;
  await page.goto(`/trips/${tripId}/expenses/${expense.id}`);
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('晚餐');
  await expect(amountInput(page)).toHaveValue('300');
  const form = new SharedExpenseForm(page);
  await form.choosePayer('Alice');
  await form.chooseShares(['Alice', 'Amy', 'Bob']);
  await amountInput(page).fill('200');
  const state: LostExpenseCorrectionState = {
    expenseId: expense.id,
    tripId,
    before,
    draft: {
      item: '晚餐',
      amount: '200',
      currencyCode: 'JPY',
      spentOn: expense.spentOn,
      categoryId: null,
      payerMemberId: expense.payerMemberId,
      shareMemberIds: expense.shares.map((share) => share.memberId),
    },
    // A PATCH identifies the existing expense UUID; it must never create another expense.
    ids: { commandId: expense.id, mutationIds: [], lookupIds: [] },
    mutations: [],
    lookups: [],
    blockedProjectionReads: [],
    verificationAvailable: false,
  };
  const projectionPaths = new Set([
    `/api/trips/${tripId}/expenses`,
    `/api/trips/${tripId}/settlement`,
    `/api/trips/${tripId}/totals`,
  ]);
  const handleVerification = async (route: Route): Promise<void> => {
    state.lookups.push(expense.id);
    state.ids.lookupIds.push(expense.id);
    if (state.verificationAvailable) await route.continue();
    else await route.abort('failed');
  };
  const handleMutation = async (route: Route): Promise<void> => {
    const request = route.request();
    state.mutations.push({ method: request.method(), path, body: request.postDataJSON() });
    state.ids.mutationIds.push(expense.id);
    // Fail rather than forwarding a second mutation. The real first write is never faked.
    if (state.mutations.length !== 1) {
      await route.abort('failed');
      expect(state.mutations, 'An unknown PATCH outcome must not be resent').toHaveLength(1);

      return;
    }
    assertDinnerCorrectionPayload(state.mutations[0]!.body, state.draft);
    const response = await route.fetch();
    expect(response.status(), 'The dropped response must be a real successful PATCH').toBe(200);
    const after = await readBrowserSplittingSnapshot(world);
    state.authoritativeAfter = after;
    const saved = after.expenses.items.find((row) => row.id === expense.id)!;
    assertSavedDinnerCorrection(expense, saved);
    expect(saved.shares.map((share) => share.memberId).sort()).toEqual(
      expense.shares.map((share) => share.memberId).sort(),
    );
    for (const share of saved.shares)
      expect(
        independentSplittingOracle.equal(share.amount, {
          numerator: '200',
          denominator: '3',
          minorUnit: 0,
        }),
      ).toBe(true);
    expect(after.sources.expenses.map((row) => row.id)).toEqual([expense.id]);
    expect(after.sources.repayments).toEqual(before.sources.repayments);
    expect(after.sources.settlements).toEqual(before.sources.settlements);
    expect(after.sources.adjustments).toEqual(before.sources.adjustments);
    expect(BigInt(after.settlement.accountingRevision)).toBe(
      BigInt(before.settlement.accountingRevision) + 1n,
    );
    // Authority is retained only in the test world. No saved response reaches the browser.
    await route.abort('failed');
  };
  const handler = async (route: Route): Promise<void> => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === path && request.method() === 'PATCH') return handleMutation(route);
    if (pathname === path && request.method() === 'GET' && state.mutations.length > 0)
      return handleVerification(route);
    if (
      request.method() === 'GET' &&
      projectionPaths.has(pathname) &&
      state.mutations.length > 0 &&
      !state.verificationAvailable
    ) {
      state.blockedProjectionReads.push(pathname);

      return route.abort('failed');
    }

    return route.continue();
  };
  const pattern = `**/api/trips/${tripId}/**`;
  state.interceptor = {
    ids: state.ids,
    handleMutation,
    handleVerification,
    restore: async () => {
      state.verificationAvailable = true;
      await page.unroute(pattern, handler);
    },
  };
  world.set(lostExpenseCorrectionKey, state);
  await page.route(pattern, handler);
  await expect(amountInput(page)).toHaveValue('200');
  expect(state.mutations).toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}
