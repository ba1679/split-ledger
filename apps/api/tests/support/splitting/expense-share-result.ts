import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const expenseShareResultPhrase = '該支出的分攤份額為：';
export interface ExpenseShareResultRow {
  成員: string;
  幣別: string;
  份額: string;
}
interface ExpectedShare {
  memberId: string;
  numerator: bigint;
  denominator: bigint;
}

export function expectedExpenseShares(
  rows: readonly ExpenseShareResultRow[],
  memberId: (name: string) => string,
  currency: string,
): ExpectedShare[] {
  expect(rows.length).toBeGreaterThan(0);
  const expected = rows.map((row) => {
    expect(Object.keys(row).sort()).toEqual(['成員', '幣別', '份額'].sort());
    expect(row.幣別).toBe(currency);
    expect(row.份額).toMatch(/^\d+(?:\/[1-9]\d*)?$/);
    const [n, d = '1'] = row.份額.split('/');
    return { memberId: memberId(row.成員), numerator: BigInt(n!), denominator: BigInt(d) };
  });
  expect(new Set(expected.map((row) => row.memberId)).size).toBe(expected.length);
  return expected;
}

export function assertExpenseShareResult(
  view: unknown,
  snapshot: SourceSnapshot,
  expenseId: string,
  expected: readonly ExpectedShare[],
  requestedMemberIds: readonly string[],
): void {
  const expense = snapshot.expenses.find((row) => row.id === expenseId);
  expect(expense, 'Created expense must exist in authoritative storage').toBeDefined();
  const unit = Number(expense!.minor_unit);
  expect(Number.isInteger(unit) && unit >= 0 && unit <= 4).toBe(true);
  const scale = 10n ** BigInt(unit);
  const amount = BigInt(String(expense!.amount_minor));
  const nonzero = expected.filter((row) => row.numerator !== 0n);
  const ids = nonzero.map((row) => row.memberId).sort();
  expect(ids).toEqual([...requestedMemberIds].sort());
  expect(
    snapshot.shares
      .filter((row) => row.expense_id === expenseId)
      .map((row) => row.member_id)
      .sort(),
  ).toEqual(ids);
  let sumN = 0n,
    sumD = 1n;
  for (const row of nonzero) {
    expect(
      row.numerator * scale * BigInt(ids.length),
      'Each expected share must independently equal amount_minor / count',
    ).toBe(amount * row.denominator);
    sumN = sumN * row.denominator + row.numerator * sumD;
    sumD *= row.denominator;
  }
  expect(sumN * scale, 'All shares must sum exactly to the source expense').toBe(amount * sumD);
  expect(view).toMatchObject({
    id: expenseId,
    currencyCode: expense!.currency_code,
    minorUnit: unit,
  });
  const shares = (
    view as {
      shares: {
        memberId: string;
        amount: { numerator: string; denominator: string; minorUnit: number };
      }[];
    }
  ).shares;
  expect(Array.isArray(shares), 'Expense must return exact shares').toBe(true);
  expect(shares.map((row) => row.memberId).sort()).toEqual(ids);
  for (const share of shares) {
    const target = nonzero.find((row) => row.memberId === share.memberId)!;
    expect(share.amount.numerator).toMatch(/^[1-9]\d*$/);
    expect(share.amount.denominator).toMatch(/^[1-9]\d*$/);
    expect(share.amount.minorUnit).toBe(unit);
    expect(BigInt(share.amount.numerator) * target.denominator).toBe(
      target.numerator * BigInt(share.amount.denominator) * scale,
    );
  }
}

export async function assertCreatedExpenseShares(
  world: LedgerWorld,
  rows: readonly ExpenseShareResultRow[],
): Promise<void> {
  expect(world.response, 'When must retain create response').toBeDefined();
  expect(world.response!.status()).toBe(201);
  const request = world.get<{ id: string; currencyCode: string; shareMemberIds: string[] }>(
    'splitting:expenseRequest',
  );
  const expected = expectedExpenseShares(
    rows,
    (name) => splittingMemberId(world, name === 'owner' ? 'Alice' : name),
    request.currencyCode,
  );
  const snapshot = await snapshotSplittingSources(world);
  assertExpenseShareResult(
    world.get('splitting:reply'),
    snapshot,
    request.id,
    expected,
    request.shareMemberIds,
  );
  const response = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/expenses/${request.id}`,
  );
  expect(response.status()).toBe(200);
  assertExpenseShareResult(
    await response.json(),
    snapshot,
    request.id,
    expected,
    request.shareMemberIds,
  );
  expect(
    await snapshotSplittingSources(world),
    'Single expense read must preserve sources',
  ).toEqual(snapshot);
}
