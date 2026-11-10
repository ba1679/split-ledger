import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const memberBalancesResultPhrase = '成員的分幣別精確淨額如下：';

export interface MemberBalanceTableRow {
  成員: string;
  幣別: string;
  淨額: string;
}
interface BalanceRow {
  memberId: string;
  currencyCode: string;
  netAmount: ExactAmount;
}
interface BalanceView {
  accountingRevision: string;
  balances: BalanceRow[];
}

/** Table values are major-unit signed rational numbers, independently parsed. */
export function tableBalance(value: string): ExactAmount {
  expect(value).toMatch(/^-?\d+(?:\/\d+|\.\d+)?$/);
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/');
    expect(BigInt(denominator!) > 0n).toBe(true);

    return {
      numerator: BigInt(numerator!).toString(),
      denominator: BigInt(denominator!).toString(),
      minorUnit: 0,
    };
  }
  const [whole, decimals = ''] = value.split('.');

  return {
    numerator: BigInt(`${whole}${decimals}`).toString(),
    denominator: (10n ** BigInt(decimals.length)).toString(),
    minorUnit: 0,
  };
}

export function assertMemberBalanceProjection(
  snapshot: SourceSnapshot,
  view: BalanceView,
  table: readonly MemberBalanceTableRow[],
  resolve: (name: string) => string,
): void {
  expect(table.length).toBeGreaterThan(0);
  expect(view.accountingRevision).toBe(String(snapshot.trips[0]!.accounting_revision));
  expect(Array.isArray(view.balances)).toBe(true);
  const members = new Set(snapshot.members.map((row) => String(row.id)));
  const currencies = new Set(
    [...snapshot.expenses, ...snapshot.repayments, ...snapshot.adjustments].map((row) =>
      String(row.currency_code),
    ),
  );
  const key = (id: string, currency: string) => JSON.stringify([id, currency]);
  const expected = new Map<string, ExactAmount>();
  for (const row of table) {
    expect(Object.keys(row).sort()).toEqual(['成員', '幣別', '淨額'].sort());
    expect(row.幣別).toMatch(/^[A-Z]{3}$/);
    const id = resolve(row.成員);
    expect(members.has(id)).toBe(true);
    expect(currencies.has(row.幣別)).toBe(true);
    const entry = key(id, row.幣別);
    expect(expected.has(entry), 'Duplicate member/currency table row').toBe(false);
    expected.set(entry, tableBalance(row.淨額));
  }
  const seen = new Set<string>();
  for (const balance of view.balances) {
    expect(members.has(balance.memberId), 'No foreign member balance').toBe(true);
    expect(currencies.has(balance.currencyCode), 'No unrelated currency balance').toBe(true);
    const entry = key(balance.memberId, balance.currencyCode);
    expect(seen.has(entry), 'Balance rows must be unique').toBe(false);
    seen.add(entry);
    const amount = balance.netAmount;
    expect(amount.numerator).toMatch(/^-?\d+$/);
    expect(amount.denominator).toMatch(/^[1-9]\d*$/);
    expect(
      Number.isInteger(amount.minorUnit) && amount.minorUnit >= 0 && amount.minorUnit <= 4,
    ).toBe(true);
    const oracle = independentSplittingOracle.balance(
      snapshot,
      balance.memberId,
      balance.currencyCode,
    );
    expect(
      independentSplittingOracle.equal(amount, oracle),
      'Balance must match all authoritative sources',
    ).toBe(true);
  }
  for (const id of members)
    for (const currency of currencies) {
      const entry = key(id, currency);
      const oracle = independentSplittingOracle.balance(snapshot, id, currency);
      const target = expected.get(entry) ?? { numerator: '0', denominator: '1', minorUnit: 0 };
      expect(
        independentSplittingOracle.equal(oracle, target),
        'Unlisted member/currency must be zero; listed values must match sources',
      ).toBe(true);
      if (BigInt(oracle.numerator) !== 0n)
        expect(seen.has(entry), 'Every nonzero oracle balance must be returned').toBe(true);
    }
}

export async function assertMemberBalances(
  world: LedgerWorld,
  rows: readonly MemberBalanceTableRow[],
): Promise<void> {
  expect(world.response, 'Settlement When must retain its response').toBeDefined();
  expect(world.response!.status()).toBe(200);
  const snapshot = await snapshotSplittingSources(world);
  expect(snapshot, 'The query must retain the same authoritative revision and sources').toEqual(
    world.get<SourceSnapshot>('splitting:sourceSnapshot'),
  );
  const view = world.get<BalanceView>('splitting:reply');
  const resolve = (name: string) => splittingMemberId(world, name);
  assertMemberBalanceProjection(snapshot, view, rows, resolve);
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status()).toBe(200);
  const reread = (await response.json()) as BalanceView;
  assertMemberBalanceProjection(snapshot, reread, rows, resolve);
  expect(reread.accountingRevision).toBe(view.accountingRevision);
  expect(
    [...reread.balances].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ).toEqual([...view.balances].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  expect(await snapshotSplittingSources(world), 'Balance reads must preserve every source').toEqual(
    snapshot,
  );
}
