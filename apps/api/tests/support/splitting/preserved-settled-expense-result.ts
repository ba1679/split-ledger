import { sourceTimestamp, sourceDateOnly } from './source-temporal.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { assertExpenseShareResult, expectedExpenseShares } from './expense-share-result.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const preservedSettledExpensePhrase = '結清後原支出與分攤集合保持不變';

export function assertSettlementPreservesExpenseSources(
  before: SourceSnapshot,
  after: SourceSnapshot,
): void {
  expect(before.expenses.length, 'Given must supply the original expense').toBeGreaterThan(0);
  expect(after.expenses, 'Settlement must preserve every original expense column').toEqual(
    before.expenses,
  );
  expect(after.shares, 'Settlement must preserve the complete original participant rows').toEqual(
    before.shares,
  );
}

export function assertPreservedSnackView(
  value: unknown,
  before: SourceSnapshot,
  expenseId: string,
  memberIds: readonly string[],
): void {
  const expense = before.expenses.find((row) => row.id === expenseId);
  expect(expense, 'Original snack must exist').toBeDefined();
  expect(expense).toMatchObject({ amount_minor: '100', currency_code: 'JPY', minor_unit: 0 });
  expect(memberIds).toHaveLength(3);
  expect(expense!.category_id, 'This scenario uses an uncategorized snack').toBeNull();
  expect(value).toMatchObject({
    id: expenseId,
    tripId: expense!.trip_id,
    item: expense!.item,
    amount: '100',
    currencyCode: expense!.currency_code,
    minorUnit: expense!.minor_unit,
    spentOn: sourceDateOnly(expense!.spent_on),
    category: null,
    payerMemberId: expense!.payer_member_id,
    createdAt: sourceTimestamp(expense!.created_at),
    updatedAt: sourceTimestamp(expense!.updated_at),
  });
  const expected = expectedExpenseShares(
    memberIds.map((id) => ({ 成員: id, 幣別: 'JPY', 份額: '100/3' })),
    (id) => id,
    'JPY',
  );
  assertExpenseShareResult(value, before, expenseId, expected, memberIds);
  for (const memberId of memberIds)
    expect(
      independentSplittingOracle.equal(
        independentSplittingOracle.share(before, expenseId, memberId),
        { numerator: '100', denominator: '3', minorUnit: 0 },
      ),
      'Each original participant still owes exactly 100/3, summing to 100',
    ).toBe(true);
}

export async function assertPreservedSettledExpense(world: LedgerWorld): Promise<void> {
  expect(world.response, 'When must retain the successful settlement response').toBeDefined();
  expect(world.response!.status()).toBe(201);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertSettlementPreservesExpenseSources(before, after);
  const expenseId = world.splitting.ids.expenses.get('點心');
  expect(expenseId, 'The Given must identify the original snack').toBeDefined();
  const ids = ['Alice', 'Amy', 'Bob'].map((name) => splittingMemberId(world, name));
  const base = `/api/trips/${splittingTripId(world)}/expenses`;
  const detail = await callApi(world, 'GET', `${base}/${expenseId!}`);
  expect(detail.status()).toBe(200);
  assertPreservedSnackView(await detail.json(), before, expenseId!, ids);
  const list = await callApi(world, 'GET', base);
  expect(list.status()).toBe(200);
  const items = (await list.json()) as { items: { id: string }[] };
  expect(Array.isArray(items.items)).toBe(true);
  expect(items.items.map((row) => row.id).sort()).toEqual(
    before.expenses.map((row) => String(row.id)).sort(),
  );
  assertPreservedSnackView(
    items.items.find((row) => row.id === expenseId),
    before,
    expenseId!,
    ids,
  );
  expect(await snapshotSplittingSources(world), 'Expense reads must not mutate any source').toEqual(
    after,
  );
}
