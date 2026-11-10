import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { expenseAuthorityWorld } from '../../../../api/tests/support/splitting/legacy-fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserExpense,
  type BrowserSplittingSnapshot,
} from './fixture.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const expenseShareViewKey = 'splitting:expenseShareView';

export interface ExpenseShareView {
  expenseId: string;
  expense: BrowserExpense;
  members: BrowserDirectoryMember[];
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

/** Open the actual saved expense, including the separately migrated legacy authority. */
export async function viewExpenseShares(page: Page, world: LedgerWorld, item: string) {
  const authority = expenseAuthorityWorld(world);
  const tripId = splittingTripId(authority);
  const before = await readBrowserSplittingSnapshot(authority);
  const matches = before.expenses.items.filter((expense) => expense.item === item);
  expect(matches, `Given must identify one saved expense named ${item}`).toHaveLength(1);
  const expected = matches[0]!;
  const path = `/api/trips/${tripId}/expenses/${expected.id}`;
  const memberPath = `/api/trips/${tripId}/members`;
  const directoryReply = await callApi(authority, 'GET', memberPath);
  expect(directoryReply.status(), 'Product must provide the owner member directory').toBe(200);
  const directory = (await directoryReply.json()) as { items: BrowserDirectoryMember[] };
  expect(Array.isArray(directory.items), 'Member directory must return items').toBe(true);
  const writes: string[] = [];
  const onRequest = (request: import('@playwright/test').Request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(request.method()))
      writes.push(`${request.method()} ${url.pathname}`);
  };
  page.on('request', onRequest);
  try {
    const expenseRead = page.waitForResponse(
      (reply) => reply.request().method() === 'GET' && new URL(reply.url()).pathname === path,
    );
    const membersRead = page.waitForResponse(
      (reply) => reply.request().method() === 'GET' && new URL(reply.url()).pathname === memberPath,
    );
    await page.goto(`/trips/${tripId}/expenses/${expected.id}`);
    const [expenseReply, membersReply] = await Promise.all([expenseRead, membersRead]);
    expect(expenseReply.status(), 'Saved expense detail must load from the real API').toBe(200);
    expect(membersReply.status(), 'Expense detail must load the real member names').toBe(200);
    const expense = (await expenseReply.json()) as BrowserExpense;
    const members = (await membersReply.json()) as { items: BrowserDirectoryMember[] };
    expect(expense).toEqual(expected);
    expect(members.items).toEqual(directory.items);
    await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(item);
    const after = await readBrowserSplittingSnapshot(authority);
    expect(after, 'Viewing expense shares must preserve every source and projection').toEqual(
      before,
    );
    expect(writes, 'Viewing shares must not issue any write request').toEqual([]);
    const state: ExpenseShareView = {
      expenseId: expected.id,
      expense,
      members: members.items,
      before,
      after,
    };
    world.set(expenseShareViewKey, state);
    world.set('splitting:expenseId', expected.id);
  } finally {
    page.off('request', onRequest);
  }
}
