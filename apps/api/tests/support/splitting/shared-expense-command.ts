import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import {
  fixtureMinorAmount,
  snapshotSplittingSources,
  type SplittingExpenseRow,
} from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

export const sharedExpensePhrase = 'owner 記錄平均分攤支出：';

/** Keep the supplied decimal string intact; the server owns amount validation and division. */
export function sharedExpenseRequest(
  world: LedgerWorld,
  rows: readonly SplittingExpenseRow[],
  id: string,
) {
  expect(rows, 'Shared expense command requires exactly one DataTable row').toHaveLength(1);
  const row = rows[0]!;
  expect(Object.keys(row).sort()).toEqual(['項目', '幣別', '金額', '付款人', '分攤者'].sort());
  const memberId = (name: string) => splittingMemberId(world, name === 'owner' ? 'Alice' : name);

  return {
    id,
    item: row.項目,
    currencyCode: row.幣別,
    amount: row.金額,
    payerMemberId: memberId(row.付款人),
    shareMemberIds: row.分攤者.split('、').map((name) => memberId(name.trim())),
    spentOn: '2027-01-20',
    categoryId: null,
  };
}

export async function recordSharedExpense(
  world: LedgerWorld,
  rows: readonly SplittingExpenseRow[],
): Promise<void> {
  const tripId = splittingTripId(world);
  const id = randomUUID();
  const request = sharedExpenseRequest(world, rows, id);
  const before = await snapshotSplittingSources(world, tripId);
  world.splitting.ids.expenses.set(request.item, id);
  world.set('splitting:expenseId', id);
  world.set('splitting:expenseRequest', request);
  world.set('splitting:before', before);
  world.response = await world.api.post(`/api/trips/${tripId}/expenses`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
  const after = await snapshotSplittingSources(world, tripId);
  if (world.response.status() !== 201) {
    expect(after, 'Rejected shared expense must not change any source').toEqual(before);
    expect(world.response.status(), 'Product must accept the shared expense request').toBe(201);
  }
  expect(world.get('splitting:reply')).toMatchObject({ id });
  const stored = after.expenses.filter((row) => row.id === id);
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    item: request.item,
    payer_member_id: request.payerMemberId,
    currency_code: request.currencyCode,
    category_id: null,
    amount_minor: fixtureMinorAmount(request.amount, Number(stored[0]!.minor_unit)).toString(),
  });
  expect(
    (await world.db.query('SELECT spent_on::text FROM expenses WHERE id=$1', [id])).rows,
  ).toEqual([{ spent_on: '2027-01-20' }]);
  expect(
    after.shares
      .filter((row) => row.expense_id === id)
      .map((row) => row.member_id)
      .sort(),
  ).toEqual([...request.shareMemberIds].sort());
  expect(after.expenses.filter((row) => row.id !== id)).toEqual(before.expenses);
  expect(after.shares.filter((row) => row.expense_id !== id)).toEqual(before.shares);
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
}
