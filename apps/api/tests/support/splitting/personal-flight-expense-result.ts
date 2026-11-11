import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { expenseAuthorityWorld } from './legacy-fixture.js';

export const personalFlightExpensePhrase = '機票保留原始欄位且僅由 owner 付款分攤';

export function assertPersonalFlightView(value: unknown, id: string, ownerId: string): void {
  expect(value).toMatchObject({
    id,
    item: '機票',
    amount: '8000.00',
    currencyCode: 'TWD',
    minorUnit: 2,
    spentOn: '2027-01-15',
    category: null,
    payerMemberId: ownerId,
  });
  expect((value as { shares: unknown }).shares).toEqual([
    {
      memberId: ownerId,
      amount: { numerator: '800000', denominator: '1', minorUnit: 2 },
    },
  ]);
}

export async function assertPersonalFlightExpense(world: LedgerWorld): Promise<void> {
  const authority = expenseAuthorityWorld(world);
  const tripId = authority.get<string>('splitting:tripId');
  const expenseId = world.get<string>('splitting:expenseId');
  expect(world.response, 'When must retain the create/read response').toBeDefined();
  expect(world.response!.status()).toBe(authority === world ? 201 : 200);
  const before = await snapshotSplittingSources(authority, tripId);
  const owners = before.members.filter((member) => member.role === 'owner');
  expect(owners, 'Exactly one stable owner member belongs to this trip').toHaveLength(1);
  const ownerMemberId = String(owners[0]!.id);
  const expense = before.expenses.find((row) => row.id === expenseId);
  expect(expense, 'Flight remains persisted with its original fields').toMatchObject({
    item: '機票',
    amount_minor: '800000',
    currency_code: 'TWD',
    minor_unit: 2,
    category_id: null,
    payer_member_id: ownerMemberId,
    trip_id: tripId,
  });
  expect(
    (await authority.db.query('SELECT spent_on::text FROM expenses WHERE id=$1', [expenseId])).rows,
  ).toEqual([{ spent_on: '2027-01-15' }]);
  expect(before.shares.filter((row) => row.expense_id === expenseId)).toEqual([
    expect.objectContaining({ member_id: ownerMemberId, expense_id: expenseId }),
  ]);
  if (authority.state.has('splitting:legacyExpenseBefore')) {
    const original = authority.get<Record<string, unknown>>('splitting:legacyExpenseBefore');
    const preserved = await authority.db.query(
      'SELECT id,owner_id,trip_id,category_id,item,amount_minor::text,currency_code,minor_unit,spent_on::text,created_at,updated_at FROM expenses WHERE id=$1',
      [expenseId],
    );
    expect(preserved.rows).toEqual([original]);
  }
  assertPersonalFlightView(await world.response!.json(), expenseId, ownerMemberId);
  const headers = { Cookie: authority.users.get('甲')!.cookie };
  const read = await authority.api.get(`/api/trips/${tripId}/expenses/${expenseId}`, { headers });
  expect(read.status(), 'Product must expose the persisted flight').toBe(200);
  assertPersonalFlightView(await read.json(), expenseId, ownerMemberId);
  const totals = await authority.api.get(`/api/trips/${tripId}/totals`, { headers });
  expect(totals.status()).toBe(200);
  expect(await totals.json()).toEqual({
    totals: [{ currencyCode: 'TWD', amount: '8000.00', minorUnit: 2 }],
  });
  const settlement = await authority.api.get(`/api/trips/${tripId}/settlement`, { headers });
  expect(settlement.status(), 'Product must provide settlement projection').toBe(200);
  const view = (await settlement.json()) as {
    arrangements: unknown[];
    balances: { memberId: string; currencyCode: string; netAmount: unknown }[];
  };
  expect(view.arrangements).toEqual([]);
  expect(Array.isArray(view.balances)).toBe(true);
  for (const member of before.members)
    expect(independentSplittingOracle.balance(before, String(member.id), 'TWD')).toEqual({
      numerator: '0',
      denominator: '1',
      minorUnit: 2,
    });
  for (const balance of view.balances)
    expect(balance.netAmount).toMatchObject({ numerator: '0', denominator: '1' });
  expect(
    await snapshotSplittingSources(authority, tripId),
    'Reads preserve all source data',
  ).toEqual(before);
}
