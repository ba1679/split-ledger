import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { tableBalance } from '../../../../api/tests/support/splitting/member-balances-result.js';
import { assertExactArrangementSet } from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import {
  assertSimplificationCountProjection,
  type CountSettlementView,
} from '../../../../api/tests/support/splitting/simplification-count-result.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
  type BrowserSettlement,
} from './fixture.js';
import { expectedBalanceDisplay } from './member-balances-screen-result.js';

export const arrangementsScreenPhrase = '分帳畫面只列出以下付款安排：';

export const arrangementsScreenEvidenceKey = 'splitting:browserArrangementEvidence';

export interface ScreenArrangementRow {
  付款人: string;
  收款人: string;
  幣別: string;
  金額: string;
  顯示: string;
}

/** Compare the complete DataTable to the source-only mode oracle and authoritative GET. */
export function assertScreenArrangementAuthority(
  snapshot: BrowserSplittingSnapshot,
  rows: readonly ScreenArrangementRow[],
  resolve: (name: string) => string,
): void {
  expect(rows.length, 'Arrangement DataTable requires rows').toBeGreaterThan(0);
  assertSimplificationCountProjection(snapshot.sources, snapshot.settlement as CountSettlementView);
  const expected = rows.map((row) => {
    expect(Object.keys(row).sort()).toEqual(['付款人', '收款人', '幣別', '金額', '顯示'].sort());
    expect(row.幣別).toMatch(/^[A-Z]{3}$/);
    const amount = tableBalance(row.金額);
    expect(BigInt(amount.numerator)).toBeGreaterThan(0n);
    expect(row.顯示).toBe(expectedBalanceDisplay(row.幣別, amount));

    return {
      debtorMemberId: resolve(row.付款人),
      creditorMemberId: resolve(row.收款人),
      currencyCode: row.幣別,
      amount,
    };
  });
  assertExactArrangementSet(snapshot.settlement.arrangements, expected);
  const keys = snapshot.settlement.arrangements.map((row) => row.key);
  expect(keys.every((key) => typeof key === 'string' && key.length > 0)).toBe(true);
  expect(new Set(keys).size).toBe(keys.length);
}

/** No navigation or writes: the completed When supplies the browser's confirmed query. */
export async function assertArrangementsScreen(
  page: Page,
  world: LedgerWorld,
  rows: readonly ScreenArrangementRow[],
): Promise<void> {
  const snapshot = await readBrowserSplittingSnapshot(world);
  expect(
    world.get<BrowserSettlement>('splitting:browserConfirmedSettlement'),
    'Browser must complete its current settlement query',
  ).toEqual(snapshot.settlement);
  assertScreenArrangementAuthority(snapshot, rows, (name) => splittingMemberId(world, name));
  const region = page.getByRole('region', { name: '付款安排', exact: true });
  await expect(region).toBeVisible();
  await expect(region.getByRole('group')).toHaveCount(rows.length);
  const links = region.getByRole('link', { name: '結清', exact: true });
  await expect(links).toHaveCount(rows.length);
  for (const row of rows) {
    const group = region.getByRole('group', {
      name: `${row.付款人} 付款給 ${row.收款人} ${row.幣別}`,
      exact: true,
    });
    await expect(group).toHaveCount(1);
    await expect(group).toBeVisible();
    await expect(group.getByText(row.顯示, { exact: true })).toBeVisible();
    await expect(group).not.toContainText(/\d+\s*\/\s*\d+|…|\.\.\.|\d+\.\d{3}/);
    const arrangement = snapshot.settlement.arrangements.find(
      (item) =>
        item.debtorMemberId === splittingMemberId(world, row.付款人) &&
        item.creditorMemberId === splittingMemberId(world, row.收款人) &&
        item.currencyCode === row.幣別,
    )!;
    const link = group.getByRole('link', { name: '結清', exact: true });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    const url = new URL(href!, page.url());
    expect(url.pathname).toBe(`/trips/${splittingTripId(world)}/settlements/new`);
    expect([...url.searchParams.values()]).toContain(arrangement.key);
  }
  world.set(arrangementsScreenEvidenceKey, structuredClone(snapshot.settlement));
  world.set('splitting:revision', snapshot.settlement.accountingRevision);
  expect(
    await readBrowserSplittingSnapshot(world),
    'Then reads preserve every source and revision',
  ).toEqual(snapshot);
}
