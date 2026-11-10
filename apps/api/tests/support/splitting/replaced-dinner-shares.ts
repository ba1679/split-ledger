import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { fixtureMinorAmount, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const replacedDinnerSharesPhrase = '晚餐的新份額為 Amy 與 Bob 各 JPY 100';

export function assertReplacedDinnerRows(
  before: SourceSnapshot,
  after: SourceSnapshot,
  expenseId: string,
  amyId: string,
  bobId: string,
): void {
  const old = before.expenses.find((row) => row.id === expenseId);
  const current = after.expenses.find((row) => row.id === expenseId);
  expect(old, 'Given must persist dinner').toBeDefined();
  expect(current, 'Correction must preserve dinner identity').toBeDefined();
  expect(current).toEqual({
    ...old,
    amount_minor: fixtureMinorAmount('200', Number(old!.minor_unit)).toString(),
    payer_member_id: amyId,
    updated_at: current!.updated_at,
  });
  expect(current!.currency_code).toBe('JPY');
  expect(
    after.shares
      .filter((row) => row.expense_id === expenseId)
      .map((row) => row.member_id)
      .sort(),
  ).toEqual([amyId, bobId].sort());
  expect(after.expenses.filter((row) => row.id !== expenseId)).toEqual(
    before.expenses.filter((row) => row.id !== expenseId),
  );
  expect(after.shares.filter((row) => row.expense_id !== expenseId)).toEqual(
    before.shares.filter((row) => row.expense_id !== expenseId),
  );
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Correction must preserve ${key}`).toEqual(before[key]);
}

export function assertReplacedDinnerView(
  value: unknown,
  expenseId: string,
  amyId: string,
  bobId: string,
  minorUnit: number,
): void {
  const expected = [amyId, bobId]
    .map((memberId) => ({
      memberId,
      amount: {
        numerator: fixtureMinorAmount('100', minorUnit).toString(),
        denominator: '1',
        minorUnit,
      },
    }))
    .sort((a, b) => a.memberId.localeCompare(b.memberId));
  expect(value).toMatchObject({
    id: expenseId,
    payerMemberId: amyId,
    amount: '200',
    currencyCode: 'JPY',
    minorUnit,
  });
  const view = value as { shares: { memberId: string; amount: unknown }[] };
  expect(Array.isArray(view.shares), 'Expense must expose authoritative exact shares').toBe(true);
  expect([...view.shares].sort((a, b) => a.memberId.localeCompare(b.memberId))).toEqual(expected);
}

export async function assertReplacedDinnerShares(world: LedgerWorld): Promise<void> {
  expect(world.response, 'When must retain correction response').toBeDefined();
  expect(world.response!.status(), 'Dinner correction succeeds').toBe(200);
  const expenseId = world.get<string>('splitting:expenseId');
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  const amyId = splittingMemberId(world, 'Amy');
  const bobId = splittingMemberId(world, 'Bob');
  assertReplacedDinnerRows(before, after, expenseId, amyId, bobId);
  const unit = Number(after.expenses.find((row) => row.id === expenseId)!.minor_unit);
  assertReplacedDinnerView(world.get('splitting:reply'), expenseId, amyId, bobId, unit);
  const response = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/expenses/${expenseId}`,
  );
  expect(response.status()).toBe(200);
  assertReplacedDinnerView(await response.json(), expenseId, amyId, bobId, unit);
  expect(await snapshotSplittingSources(world), 'Read cannot change corrected sources').toEqual(
    after,
  );
}
