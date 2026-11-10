import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const preservedInactiveSharesPhrase = '既有停用成員的分攤集合保持原值';

export function assertInactiveShareRows(
  before: SourceSnapshot,
  after: SourceSnapshot,
  expenseId: string,
  carolId: string,
): void {
  expect(before.members.find((row) => row.id === carolId)).toMatchObject({ is_active: false });
  expect(
    before.shares.some((row) => row.expense_id === expenseId && row.member_id === carolId),
  ).toBe(true);
  const oldExpense = before.expenses.find((row) => row.id === expenseId);
  const newExpense = after.expenses.find((row) => row.id === expenseId);
  expect(oldExpense).toBeDefined();
  expect(newExpense).toBeDefined();
  expect(newExpense).toEqual({
    ...oldExpense,
    item: '車票修正',
    updated_at: newExpense!.updated_at,
  });
  expect(after.expenses.filter((row) => row.id !== expenseId)).toEqual(
    before.expenses.filter((row) => row.id !== expenseId),
  );
  for (const key of ['members', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Metadata correction must preserve ${key}`).toEqual(before[key]);
}

export async function assertPreservedInactiveShares(world: LedgerWorld): Promise<void> {
  expect(
    world.response!.status(),
    'Metadata correction with historical inactive shares succeeds',
  ).toBe(200);
  const before = world.get<SourceSnapshot>('splitting:before');
  const expenseId = world.get<string>('splitting:expenseId');
  const carolId = splittingMemberId(world, 'Carol');
  const after = await snapshotSplittingSources(world);
  assertInactiveShareRows(before, after, expenseId, carolId);
  const expense = after.expenses.find((row) => row.id === expenseId)!;
  const expectedShares = before.shares
    .filter((row) => row.expense_id === expenseId)
    .map((row) => ({
      memberId: String(row.member_id),
      amount: independentSplittingOracle.share(before, expenseId, String(row.member_id)),
    }))
    .sort((a, b) => a.memberId.localeCompare(b.memberId));
  const tripId = splittingTripId(world);
  expect(world.get('splitting:reply')).toMatchObject({
    id: expenseId,
    item: '車票修正',
    payerMemberId: expense.payer_member_id,
    shares: expectedShares,
  });
  for (let read = 0; read < 2; read++) {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/expenses/${expenseId}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      id: expenseId,
      item: '車票修正',
      payerMemberId: expense.payer_member_id,
      shares: expectedShares,
    });
    const settlement = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
    expect(settlement.status()).toBe(200);
    const view = (await settlement.json()) as {
      balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
    };
    const balance = view.balances.find(
      (row) => row.memberId === carolId && row.currencyCode === expense.currency_code,
    );
    expect(
      balance,
      'Inactive Carol must retain her historical liability in settlement',
    ).toBeDefined();
    expect(
      independentSplittingOracle.equal(
        balance!.netAmount,
        independentSplittingOracle.balance(before, carolId, String(expense.currency_code)),
      ),
    ).toBe(true);
    expect(BigInt(balance!.netAmount.numerator) < 0n).toBe(true);
  }
  expect(
    await snapshotSplittingSources(world),
    'Verification reads cannot mutate historical references',
  ).toEqual(after);
}
