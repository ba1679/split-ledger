import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { expenseLink } from '../expense-helpers.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { sharedExpenseSaveKey, type SharedExpenseSave } from './save-shared-expense.js';
import {
  assertEqualExpenseShares,
  assertMemberShareDisplay,
} from './expense-share-display-result.js';

export const savedThreeWayExpensePhrase = '點心已保存且三人各分攤 JPY 100\\/3';

/** Exact expectations come from the three-way example, never its rounded display. */
export function assertThreeWayExpenseProjection(
  snapshot: BrowserSplittingSnapshot,
  expenseId: string,
) {
  const ids = ['Alice', 'Amy', 'Bob'].map((name) => {
    const members = snapshot.sources.members.filter((row) => row.name === name);
    expect(members).toHaveLength(1);

    return String(members[0]!.id);
  });
  const [alice, amy, bob] = ids as [string, string, string];
  expect(snapshot.expenses.items).toHaveLength(1);
  const expense = snapshot.expenses.items[0]!;
  expect(expense).toMatchObject({
    id: expenseId,
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    minorUnit: 0,
    payerMemberId: alice,
  });
  assertEqualExpenseShares(expense, ids);
  expect(snapshot.sources.expenses).toHaveLength(1);
  expect(snapshot.sources.expenses[0]).toMatchObject({
    id: expenseId,
    payer_member_id: alice,
    amount_minor: '100',
    currency_code: 'JPY',
    minor_unit: 0,
  });
  expect(snapshot.sources.shares.map((row) => [row.expense_id, row.member_id]).sort()).toEqual(
    ids.map((id) => [expenseId, id]).sort(),
  );
  for (const id of ids)
    expect(
      independentSplittingOracle.equal(
        independentSplittingOracle.share(snapshot.sources, expenseId, id),
        { numerator: '100', denominator: '3', minorUnit: 0 },
      ),
    ).toBe(true);
  expect(snapshot.sources.repayments).toEqual([]);
  expect(snapshot.sources.settlements).toEqual([]);
  expect(snapshot.sources.adjustments).toEqual([]);
  expect(
    snapshot.settlement.balances.map((row) => [row.memberId, row.currencyCode]).sort(),
  ).toEqual(ids.map((id) => [id, 'JPY']).sort());
  for (const row of snapshot.settlement.balances)
    expect(row.netAmount).toEqual({
      numerator: row.memberId === alice ? '200' : '-100',
      denominator: '3',
      minorUnit: 0,
    });
  expect(
    snapshot.settlement.arrangements
      .map((row) => [row.debtorMemberId, row.creditorMemberId, row.currencyCode])
      .sort(),
  ).toEqual(
    [
      [amy, alice, 'JPY'],
      [bob, alice, 'JPY'],
    ].sort(),
  );
  expect(new Set(snapshot.settlement.arrangements.map((row) => row.key)).size).toBe(2);
  for (const row of snapshot.settlement.arrangements) {
    expect(row.key).not.toBe('');
    expect(row.amount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  }
}

/** Then stays on the saved ledger and refreshes only through owner-scoped GETs. */
export async function assertSavedThreeWayExpense(page: Page, world: LedgerWorld) {
  const saved = world.get<SharedExpenseSave>(sharedExpenseSaveKey);
  expect(saved.outcome).toBe('saved');
  expect(saved.status).toBe(201);
  expect(saved.expenseId).not.toBeNull();
  const tripId = splittingTripId(world);
  const expenseId = saved.expenseId!;
  assertThreeWayExpenseProjection(saved.after, expenseId);
  const expense = saved.after.expenses.items[0]!;
  expect(saved.payload).toMatchObject({
    id: expenseId,
    payerMemberId: expense.payerMemberId,
    spentOn: saved.draft.spentOn,
    categoryId: saved.draft.categoryId,
  });
  expect(Object.keys(saved.payload!).filter((key) => /payer/i.test(key))).toEqual([
    'payerMemberId',
  ]);
  expect([...(saved.payload!.shareMemberIds as string[])].sort()).toEqual(
    expense.shares.map((row) => row.memberId).sort(),
  );
  expect(expense.spentOn).toBe(saved.draft.spentOn);
  expect(expense.category).toBe(saved.draft.categoryId);
  expect(saved.after.sources.members).toEqual(saved.before.sources.members);
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/?$`));
  const card = expenseLink(page, '點心');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('JPY 100');
  await expect(card).toContainText('Alice');
  await assertMemberShareDisplay(card, ['Alice', 'Amy', 'Bob'], 'JPY 33.33');
  const response = await callApi(world, 'GET', `/api/trips/${tripId}/expenses/${expenseId}`);
  expect(response.status(), 'Created expense must remain readable under its original UUID').toBe(
    200,
  );
  expect(await response.json()).toEqual(expense);
  const current = await readBrowserSplittingSnapshot(world);
  expect(current, 'Saved ledger, current recommendations and source revision must agree').toEqual(
    saved.after,
  );
  assertThreeWayExpenseProjection(current, expenseId);
}
