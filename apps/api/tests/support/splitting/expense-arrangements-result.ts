import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { AccessArrangement, AccessSettlementView } from './access-fixture.js';
import type { SourceSnapshot } from './types.js';

export const expenseArrangementsPhrase = '該旅行的付款安排為：';

export interface ExpenseArrangementRow {
  付款人: string;
  收款人: string;
  幣別: string;
  金額: string;
}
type Edge = Omit<AccessArrangement, 'key'>;

/** Source-only pairwise oracle; all arithmetic is integer rational major units. */
export function directExpenseArrangements(snapshot: SourceSnapshot): Edge[] {
  const pairs = new Map<
    string,
    { low: string; high: string; currency: string; n: bigint; d: bigint }
  >();
  const add = (from: string, to: string, currency: string, n: bigint, d: bigint, unit: number) => {
    if (from === to) return;
    expect(d > 0n && Number.isInteger(unit) && unit >= 0 && unit <= 4).toBe(true);
    const [low, high] = [from, to].sort() as [string, string];
    const key = JSON.stringify([low, high, currency]);
    const old = pairs.get(key) ?? { low, high, currency, n: 0n, d: 1n };
    d *= 10n ** BigInt(unit);
    if (from !== low) n = -n;
    old.n = old.n * d + n * old.d;
    old.d *= d;
    pairs.set(key, old);
  };
  for (const expense of snapshot.expenses) {
    const shares = snapshot.shares.filter((row) => row.expense_id === expense.id);
    expect(shares.length, 'Every stored expense requires its current share set').toBeGreaterThan(0);
    expect(new Set(shares.map((row) => row.member_id)).size).toBe(shares.length);
    for (const share of shares)
      add(
        String(share.member_id),
        String(expense.payer_member_id),
        String(expense.currency_code),
        BigInt(String(expense.amount_minor)),
        BigInt(shares.length),
        Number(expense.minor_unit),
      );
  }
  for (const share of snapshot.shares)
    expect(
      snapshot.expenses.some((row) => row.id === share.expense_id),
      'No deleted expense share remains',
    ).toBe(true);
  for (const payment of snapshot.repayments)
    add(
      String(payment.payee_member_id),
      String(payment.payer_member_id),
      String(payment.currency_code),
      BigInt(String(payment.amount_minor)),
      1n,
      Number(payment.minor_unit),
    );
  for (const adjustment of snapshot.adjustments) {
    const settlement = snapshot.settlements.find((row) => row.id === adjustment.settlement_id);
    expect(settlement, 'Adjustment must retain its linked settlement').toBeDefined();
    const debtor = String(settlement!.debtor_member_id),
      creditor = String(settlement!.creditor_member_id);
    expect([debtor, creditor]).toContain(adjustment.member_id);
    // The debtor entry represents the pair once; the creditor must be the opposite fact.
    if (adjustment.member_id !== debtor) continue;
    const opposite = snapshot.adjustments.filter(
      (row) => row.settlement_id === adjustment.settlement_id && row.member_id === creditor,
    );
    expect(opposite).toHaveLength(1);
    expect(
      BigInt(String(adjustment.numerator)) *
        BigInt(String(opposite[0]!.denominator)) *
        10n ** BigInt(Number(opposite[0]!.minor_unit)) +
        BigInt(String(opposite[0]!.numerator)) *
          BigInt(String(adjustment.denominator)) *
          10n ** BigInt(Number(adjustment.minor_unit)),
    ).toBe(0n);
    add(
      creditor,
      debtor,
      String(adjustment.currency_code),
      BigInt(String(adjustment.numerator)),
      BigInt(String(adjustment.denominator)),
      Number(adjustment.minor_unit),
    );
  }

  return [...pairs.values()]
    .filter((row) => row.n !== 0n)
    .map((row) => ({
      debtorMemberId: row.n > 0n ? row.low : row.high,
      creditorMemberId: row.n > 0n ? row.high : row.low,
      currencyCode: row.currency,
      amount: {
        numerator: (row.n < 0n ? -row.n : row.n).toString(),
        denominator: row.d.toString(),
        minorUnit: 0,
      },
    }));
}

export function assertExactArrangementSet(
  actual: readonly Edge[],
  expected: readonly Edge[],
): void {
  expect(actual).toHaveLength(expected.length);
  const keys = actual.map((row) =>
    JSON.stringify([row.debtorMemberId, row.creditorMemberId, row.currencyCode]),
  );
  expect(new Set(keys).size, 'Arrangement set cannot contain duplicates').toBe(keys.length);
  for (const row of actual) {
    expect(row.debtorMemberId).not.toBe(row.creditorMemberId);
    expect(row.amount.numerator).toMatch(/^[1-9]\d*$/);
    expect(row.amount.denominator).toMatch(/^[1-9]\d*$/);
    expect(
      Number.isInteger(row.amount.minorUnit) &&
        row.amount.minorUnit >= 0 &&
        row.amount.minorUnit <= 4,
    ).toBe(true);
    const wanted = expected.find(
      (item) =>
        item.debtorMemberId === row.debtorMemberId &&
        item.creditorMemberId === row.creditorMemberId &&
        item.currencyCode === row.currencyCode,
    );
    expect(wanted, 'No unexpected, stale, or cross-currency arrangement').toBeDefined();
    expect(
      independentSplittingOracle.equal(row.amount, wanted!.amount),
      'Arrangement amount must match exactly at historical scale',
    ).toBe(true);
  }
}

function majorAmount(text: string): ExactAmount {
  expect(text).toMatch(/^\d+(?:\/\d+|\.\d+)?$/);
  if (text.includes('/')) {
    const [numerator, denominator] = text.split('/');
    expect(BigInt(denominator!) > 0n).toBe(true);

    return { numerator: numerator!, denominator: denominator!, minorUnit: 0 };
  }
  const [whole, decimal = ''] = text.split('.');

  return {
    numerator: `${whole}${decimal}`,
    denominator: (10n ** BigInt(decimal.length)).toString(),
    minorUnit: 0,
  };
}

export async function assertExpenseArrangements(
  world: LedgerWorld,
  rows: readonly ExpenseArrangementRow[],
): Promise<void> {
  expect(rows.length).toBeGreaterThan(0);
  const expected = rows.map((row) => {
    expect(Object.keys(row).sort()).toEqual(['付款人', '收款人', '幣別', '金額'].sort());
    expect(row.幣別).toMatch(/^[A-Z]{3}$/);

    return {
      debtorMemberId: splittingMemberId(world, row.付款人),
      creditorMemberId: splittingMemberId(world, row.收款人),
      currencyCode: row.幣別,
      amount: majorAmount(row.金額),
    };
  });
  const beforeRead = await snapshotSplittingSources(world);
  assertExactArrangementSet(directExpenseArrangements(beforeRead), expected);
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status(), 'Product must expose the recalculated settlement view').toBe(200);
  const view = (await response.json()) as AccessSettlementView;
  expect(Array.isArray(view.arrangements)).toBe(true);
  assertExactArrangementSet(view.arrangements, expected);
  expect(
    await snapshotSplittingSources(world),
    'Settlement projection must not mutate accounting sources',
  ).toEqual(beforeRead);
}
