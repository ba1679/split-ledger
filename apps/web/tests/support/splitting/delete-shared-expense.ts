import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { expenseLink } from '../expense-helpers.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
  type BrowserSettlement,
} from './fixture.js';

export const deleteDinnerPhrase = 'owner 刪除共同支出晚餐';

export const deletedSharedExpenseKey = 'splitting:deletedSharedExpense';

export interface ExpenseDeletion {
  expenseId: string;
  tripId: string;
  item: string;
  mutations: { method: string; path: string; payload: string | null }[];
  status: number;
  reply: string;
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
  browserSettlement: BrowserSettlement;
}

/** Only the source and its shares may disappear; historical payment facts are immutable. */
export function assertSingleExpenseDeletion(state: ExpenseDeletion): void {
  expect(state.mutations).toEqual([
    {
      method: 'DELETE',
      path: `/api/trips/${state.tripId}/expenses/${state.expenseId}`,
      payload: null,
    },
  ]);
  expect(
    state.browserSettlement,
    'Browser settlement must reflect the latest confirmed revision',
  ).toEqual(state.after.settlement);
  expect(state.status).toBe(204);
  expect(state.before.sources.expenses.filter((row) => row.id === state.expenseId)).toHaveLength(1);
  expect(state.after.sources.expenses).toEqual(
    state.before.sources.expenses.filter((row) => row.id !== state.expenseId),
  );
  expect(state.after.sources.shares).toEqual(
    state.before.sources.shares.filter((row) => row.expense_id !== state.expenseId),
  );
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(state.after.sources[key], `Deletion must preserve ${key}`).toEqual(
      state.before.sources[key],
    );
  expect(state.after.expenses.items.some((row) => row.id === state.expenseId)).toBe(false);
  expect(BigInt(state.after.settlement.accountingRevision)).toBe(
    BigInt(state.before.settlement.accountingRevision) + 1n,
  );
}

/** Act through the actual confirmation UI; never replay Given or delete historical payments. */
export async function deleteSharedExpense(
  page: Page,
  world: LedgerWorld,
  item: string,
): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  const matches = before.expenses.items.filter((row) => row.item === item);
  expect(matches, `Exactly one existing ${item} is required`).toHaveLength(1);
  const expenseId = matches[0]!.id;
  const path = `/api/trips/${tripId}/expenses/${expenseId}`;
  const mutations: ExpenseDeletion['mutations'] = [];
  const onRequest = (request: Request) => {
    const pathname = new URL(request.url()).pathname;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      pathname.startsWith(`/api/trips/${tripId}`)
    )
      mutations.push({ method: request.method(), path: pathname, payload: request.postData() });
  };
  page.on('request', onRequest);
  try {
    await page.goto(`/trips/${tripId}`);
    await expenseLink(page, item).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/expenses/${expenseId}/?$`));
    await page.getByRole('button', { name: '刪除支出', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' && new URL(response.url()).pathname === path,
    );
    await dialog.getByRole('button', { name: '確認刪除', exact: true }).click();
    const response = await responsePromise;
    // HTTP 204 has no body; remote browsers may discard it during navigation.
    const reply = response.status() === 204 ? '' : await response.text();
    expect(response.status()).toBe(204);
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/?$`));
    await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
    await expect(expenseLink(page, item)).toHaveCount(0);
    const after = await readBrowserSplittingSnapshot(world);
    const [settlementResponse] = await Promise.all([
      page.waitForResponse(
        (result) =>
          result.request().method() === 'GET' &&
          new URL(result.url()).pathname === `/api/trips/${tripId}/settlement`,
      ),
      page.goto(`/trips/${tripId}/settlement`),
    ]);
    expect(
      settlementResponse.status(),
      'Browser must refresh the actual settlement projection',
    ).toBe(200);
    const browserSettlement = (await settlementResponse.json()) as BrowserSettlement;
    expect(browserSettlement).toEqual(after.settlement);
    const control = page.getByRole('switch', { name: '簡化付款', exact: true });
    await expect(control).toBeVisible();
    await expect(control).toBeChecked({ checked: after.settlement.simplifyDebts });
    world.set('splitting:browserConfirmedSettlement', structuredClone(browserSettlement));
    const state: ExpenseDeletion = {
      expenseId,
      tripId,
      item,
      mutations,
      status: response.status(),
      reply,
      before,
      after,
      browserSettlement,
    };
    assertSingleExpenseDeletion(state);
    world.set(deletedSharedExpenseKey, state);
    world.set('splitting:expenseId', expenseId);
    world.set('splitting:before', before.sources);
    world.set('splitting:after', after.sources);
    world.set('splitting:revision', after.settlement.accountingRevision);
  } finally {
    page.off('request', onRequest);
  }
}
