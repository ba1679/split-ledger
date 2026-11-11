import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import type { SourceSnapshot } from './types.js';

export const modeBalanceInvariancePhrase = '簡化前後每位成員的精確淨額不變';

interface ModeBalanceView {
  accountingRevision: string;
  simplifyDebts: boolean;
  balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
}

/** Compare the complete projection against pre-command DB facts, including sub-minor fractions. */
export function assertModeBalanceInvariance(
  before: SourceSnapshot,
  after: SourceSnapshot,
  view: ModeBalanceView,
): void {
  expect(before.trips).toHaveLength(1);
  expect(after.trips).toHaveLength(1);
  const current = after.trips[0]!;
  const previous = before.trips[0]!;
  expect(after.trips).toEqual([
    {
      ...previous,
      simplify_debts: current.simplify_debts,
      accounting_revision: current.accounting_revision,
      updated_at: current.updated_at,
    },
  ]);
  expect(BigInt(String(current.accounting_revision))).toBe(
    BigInt(String(previous.accounting_revision)) + 1n,
  );
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const)
    expect(after[key], `Mode changes must preserve all ${key}`).toEqual(before[key]);
  expect(view.accountingRevision).toBe(String(current.accounting_revision));
  expect(view.simplifyDebts).toBe(current.simplify_debts);
  expect(Array.isArray(view.balances)).toBe(true);
  const oracle = snapshotExactBalances(before);
  expect(snapshotExactBalances(after)).toEqual(oracle);
  const seen = new Set<string>();
  for (const row of view.balances) {
    const key = JSON.stringify([row.memberId, row.currencyCode]);
    expect(seen.has(key), 'Each member/currency may appear at most once').toBe(false);
    seen.add(key);
    const expected = oracle.find(
      (entry) => entry.memberId === row.memberId && entry.currencyCode === row.currencyCode,
    );
    expect(
      expected,
      'Balances may only reference source currencies and members of this trip',
    ).toBeDefined();
    expect(independentSplittingOracle.equal(row.netAmount, expected!.amount)).toBe(true);
  }
  const totals = new Map<string, { numerator: bigint; denominator: bigint }>();
  for (const row of oracle) {
    if (BigInt(row.amount.numerator) !== 0n)
      expect(
        seen.has(JSON.stringify([row.memberId, row.currencyCode])),
        'Every nonzero DB balance must appear',
      ).toBe(true);
    const total = totals.get(row.currencyCode) ?? { numerator: 0n, denominator: 1n };
    const denominator = BigInt(row.amount.denominator) * 10n ** BigInt(row.amount.minorUnit);
    totals.set(row.currencyCode, {
      numerator: total.numerator * denominator + BigInt(row.amount.numerator) * total.denominator,
      denominator: total.denominator * denominator,
    });
  }
  for (const [currency, total] of totals)
    expect(total.numerator, `${currency} balances must sum to exact zero independently`).toBe(0n);
}

/** Read-only confirmation: no mode switch or accounting fixture writes occur in Then. */
export async function assertModeBalancesUnchanged(world: LedgerWorld): Promise<void> {
  expect(world.response!.status(), 'Mode PATCH must succeed').toBe(200);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  expect(after.trips[0]!.simplify_debts).toBe(world.get<boolean>('splitting:simplifyDebts'));
  for (let read = 0; read < 2; read++) {
    const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
    expect(response.status(), 'Settlement must expose the mode PATCH revision').toBe(200);
    assertModeBalanceInvariance(before, after, (await response.json()) as ModeBalanceView);
  }
  expect(
    await snapshotSplittingSources(world),
    'Confirmation reads must preserve sources and revision',
  ).toEqual(after);
}
