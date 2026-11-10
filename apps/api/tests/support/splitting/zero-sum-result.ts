import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const zeroSumPhrase = '各幣別淨額精確總和為零';

export interface ZeroSumBalance {
  memberId: string;
  currencyCode: string;
  netAmount: ExactAmount;
}
interface ZeroSumView {
  accountingRevision: string;
  balances: ZeroSumBalance[];
}

function gcd(n: bigint, d: bigint): bigint {
  n = n < 0n ? -n : n;
  while (d !== 0n) [n, d] = [d, n % d];

  return n;
}

/** Independent exact major-unit accumulation; never sums rendered decimals. */
export function assertCurrencyZeroSums(
  snapshot: SourceSnapshot,
  balances: readonly ZeroSumBalance[],
): void {
  const members = new Set(snapshot.members.map((row) => String(row.id)));
  const currencies = new Set(
    [...snapshot.expenses, ...snapshot.repayments, ...snapshot.adjustments].map((row) =>
      String(row.currency_code),
    ),
  );
  const seen = new Set<string>();
  const sums = new Map<string, { n: bigint; d: bigint }>();
  for (const row of balances) {
    expect(members.has(row.memberId), 'No unknown or cross-trip member').toBe(true);
    expect(currencies.has(row.currencyCode), 'Currencies come from accounting sources').toBe(true);
    const key = JSON.stringify([row.memberId, row.currencyCode]);
    expect(seen.has(key), 'Each member/currency appears at most once').toBe(false);
    seen.add(key);
    const amount = row.netAmount;
    expect(amount.numerator).toMatch(/^(?:0|-?[1-9]\d*)$/);
    expect(amount.denominator).toMatch(/^[1-9]\d*$/);
    expect(
      Number.isInteger(amount.minorUnit) && amount.minorUnit >= 0 && amount.minorUnit <= 4,
    ).toBe(true);
    const n = BigInt(amount.numerator),
      d = BigInt(amount.denominator);
    expect(gcd(n, d), 'Every amount is reduced, with zero encoded as 0/1').toBe(1n);
    expect(
      independentSplittingOracle.equal(
        amount,
        independentSplittingOracle.balance(snapshot, row.memberId, row.currencyCode),
      ),
      'Each reported net must equal the independent source oracle',
    ).toBe(true);
    const scaledDenominator = d * 10n ** BigInt(amount.minorUnit);
    const prior = sums.get(row.currencyCode) ?? { n: 0n, d: 1n };
    const nextN = prior.n * scaledDenominator + n * prior.d;
    const nextD = prior.d * scaledDenominator;
    const divisor = gcd(nextN, nextD);
    sums.set(row.currencyCode, { n: nextN / divisor, d: nextD / divisor });
  }
  for (const currency of currencies) {
    let oracleN = 0n,
      oracleD = 1n;
    for (const member of members) {
      const expected = independentSplittingOracle.balance(snapshot, member, currency);
      if (BigInt(expected.numerator) !== 0n)
        expect(
          seen.has(JSON.stringify([member, currency])),
          'Every nonzero source net must appear',
        ).toBe(true);
      const n = BigInt(expected.numerator),
        d = BigInt(expected.denominator) * 10n ** BigInt(expected.minorUnit);
      const totalN = oracleN * d + n * oracleD,
        totalD = oracleD * d;
      const divisor = gcd(totalN, totalD);
      oracleN = totalN / divisor;
      oracleD = totalD / divisor;
    }
    expect(oracleN, `Independent ${currency} source net must sum to zero`).toBe(0n);
    expect(sums.get(currency)?.n ?? 0n, `${currency} API nets must sum to zero separately`).toBe(
      0n,
    );
  }
}

export async function assertSettlementZeroSums(world: LedgerWorld): Promise<void> {
  expect(world.response, 'A settlement query must precede this Then').toBeDefined();
  expect(world.response!.status()).toBe(200);
  const before = await snapshotSplittingSources(world);
  const initial = (await world.response!.json()) as ZeroSumView;
  expect(initial.accountingRevision).toBe(String(before.trips[0]!.accounting_revision));
  expect(Array.isArray(initial.balances)).toBe(true);
  assertCurrencyZeroSums(before, initial.balances);
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status()).toBe(200);
  const reread = (await response.json()) as ZeroSumView;
  expect(reread.accountingRevision, 'Repeated GET must observe the same source revision').toBe(
    initial.accountingRevision,
  );
  expect(Array.isArray(reread.balances)).toBe(true);
  assertCurrencyZeroSums(before, reread.balances);
  const ordered = (rows: ZeroSumBalance[]) =>
    [...rows].sort((a, b) =>
      JSON.stringify([a.memberId, a.currencyCode]).localeCompare(
        JSON.stringify([b.memberId, b.currencyCode]),
      ),
    );
  expect(ordered(reread.balances)).toEqual(ordered(initial.balances));
  expect(
    await snapshotSplittingSources(world),
    'Settlement reads must preserve every source',
  ).toEqual(before);
}
