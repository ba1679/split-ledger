import { expect, type Page } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { tableBalance } from '../../../../api/tests/support/splitting/member-balances-result.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const memberBalancesScreenPhrase = '分帳畫面顯示以下成員淨額：';

export interface ScreenMemberBalanceRow {
  成員: string;
  幣別: string;
  淨額: string;
  顯示: string;
}

/** Independent half-up display oracle; the rounded strings are never used in accounting. */
export function expectedBalanceDisplay(currency: string, amount: ExactAmount): string {
  const value = BigInt(amount.numerator);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const denominator = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit);
  const cents = (absolute * 200n + denominator) / (2n * denominator);
  const whole = cents / 100n;
  const decimal = (cents % 100n).toString().padStart(2, '0').replace(/0+$/, '');

  return `${currency} ${negative && cents !== 0n ? '-' : ''}${whole}${decimal ? `.${decimal}` : ''}`;
}

/** The table is complete for each specified currency, including zero UI rows. */
export function assertScreenBalanceAuthority(
  snapshot: BrowserSplittingSnapshot,
  rows: readonly ScreenMemberBalanceRow[],
  resolve: (name: string) => string,
): void {
  expect(rows.length, 'Balance table must not be empty').toBeGreaterThan(0);
  const members = snapshot.sources.members.map((member) => String(member.id));
  const currencies = [...new Set(rows.map((row) => row.幣別))];
  const keys = rows.map((row) => `${resolve(row.成員)}:${row.幣別}`);
  expect(new Set(keys).size, 'Duplicate member/currency table row').toBe(rows.length);
  for (const currency of currencies) {
    expect(currency).toMatch(/^[A-Z]{3}$/);
    expect(
      rows
        .filter((row) => row.幣別 === currency)
        .map((row) => resolve(row.成員))
        .sort(),
    ).toEqual([...members].sort());
    let sumNumerator = 0n;
    let sumDenominator = 1n;
    for (const row of rows.filter((entry) => entry.幣別 === currency)) {
      expect(Object.keys(row).sort()).toEqual(['成員', '幣別', '淨額', '顯示'].sort());
      const memberId = resolve(row.成員);
      const expected = tableBalance(row.淨額);
      const oracle = independentSplittingOracle.balance(snapshot.sources, memberId, currency);
      expect(
        independentSplittingOracle.equal(expected, oracle),
        'Table must match source ledger',
      ).toBe(true);
      expect(row.顯示).toBe(expectedBalanceDisplay(currency, expected));
      const returned = snapshot.settlement.balances.filter(
        (balance) => balance.memberId === memberId && balance.currencyCode === currency,
      );
      expect(returned.length).toBeLessThanOrEqual(1);
      if (BigInt(expected.numerator) !== 0n) expect(returned).toHaveLength(1);
      if (returned.length)
        expect(independentSplittingOracle.equal(returned[0]!.netAmount, expected)).toBe(true);
      sumNumerator =
        sumNumerator * BigInt(expected.denominator) + BigInt(expected.numerator) * sumDenominator;
      sumDenominator *= BigInt(expected.denominator);
    }
    expect(sumNumerator, `Exact ${currency} net sum must be zero`).toBe(0n);
  }
}

/** Read-only Then: no navigation, mode switch, form submission, or new ledger write. */
export async function assertMemberBalancesScreen(
  page: Page,
  world: LedgerWorld,
  rows: readonly ScreenMemberBalanceRow[],
): Promise<void> {
  const snapshot = await readBrowserSplittingSnapshot(world);
  assertScreenBalanceAuthority(snapshot, rows, (name) => splittingMemberId(world, name));
  const region = page.getByRole('region', { name: '成員淨額', exact: true });
  await expect(region, 'Settlement screen must expose member balances').toBeVisible();
  const currencies = new Set(rows.map((row) => row.幣別));
  for (const currency of currencies)
    await expect(region.getByRole('group', { name: new RegExp(` ${currency}$`) })).toHaveCount(
      rows.filter((row) => row.幣別 === currency).length,
    );
  for (const row of rows) {
    const group = region.getByRole('group', { name: `${row.成員} ${row.幣別}`, exact: true });
    await expect(group).toHaveCount(1);
    await expect(group.getByText(row.成員, { exact: true })).toBeVisible();
    await expect(group.getByText(row.顯示, { exact: true })).toBeVisible();
    const sign = BigInt(tableBalance(row.淨額).numerator);
    const memberId = splittingMemberId(world, row.成員);
    const hasPendingPayment = snapshot.settlement.arrangements.some(
      (payment) =>
        payment.currencyCode === row.幣別 &&
        (payment.debtorMemberId === memberId || payment.creditorMemberId === memberId),
    );
    const direction =
      sign > 0n ? '應收' : sign < 0n ? '應付' : hasPendingPayment ? '淨額為零' : '已結清';
    await expect(group.getByText(direction, { exact: true })).toBeVisible();
    await expect(group).not.toContainText(/\d+\s*\/\s*\d+|…|\.\.\.|\d+\.\d{3}/);
  }
  await expect(region).not.toContainText(/跨幣別|換算|折合|總淨額|淨額合計/);
  expect(await readBrowserSplittingSnapshot(world), 'Then reads preserve all ledger facts').toEqual(
    snapshot,
  );
}
