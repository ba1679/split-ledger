import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { expenseAuthorityWorld } from '../../../../api/tests/support/splitting/legacy-fixture.js';
import { assertPersonalFlightView } from '../../../../api/tests/support/splitting/personal-flight-expense-result.js';
import { amountInput, dateInput } from '../expense-helpers.js';
import {
  browserSplittingStateKey,
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from './fixture.js';
import { expenseShareViewKey, type ExpenseShareView } from './view-expense-shares.js';

export const migratedFlightResultPhrase =
  '機票仍由 Alice 付款且只由 Alice 分攤並保留原始內容與統計';

export function assertMigratedFlightProjection(
  snapshot: BrowserSplittingSnapshot,
  original: BrowserSplittingSnapshot,
  expenseId: string,
  ownerMemberId: string,
): void {
  expect(snapshot, 'Reading a migrated flight preserves every source and projection').toEqual(
    original,
  );
  expect(snapshot.expenses.items).toHaveLength(1);
  assertPersonalFlightView(snapshot.expenses.items[0], expenseId, ownerMemberId);
  expect(snapshot.totals).toEqual({
    totals: [{ currencyCode: 'TWD', amount: '8000.00', minorUnit: 2 }],
  });
  expect(snapshot.settlement.arrangements, 'Personal flight creates no member debt').toEqual([]);
  for (const balance of snapshot.settlement.balances) {
    expect(balance.memberId).toBe(ownerMemberId);
    expect(balance.currencyCode).toBe('TWD');
    expect(balance.netAmount).toMatchObject({ numerator: '0', denominator: '1' });
    expect(
      Number.isInteger(balance.netAmount.minorUnit) &&
        balance.netAmount.minorUnit >= 0 &&
        balance.netAmount.minorUnit <= 4,
      'Zero balances retain a legal scale',
    ).toBe(true);
  }
}

/** Then only reads the page already opened by When and the migrated database authority. */
export async function assertMigratedFlight(page: Page, world: LedgerWorld): Promise<void> {
  const authority = expenseAuthorityWorld(world);
  expect(authority, 'Legacy scenario must use the separately migrated database').not.toBe(world);
  const state = world.get<ExpenseShareView>(expenseShareViewKey);
  const original = authority.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  const tripId = authority.get<string>('splitting:tripId');
  const oldExpense = authority.get<Record<string, unknown>>('splitting:legacyExpenseBefore');
  const owner = state.members.filter((member) => member.role === 'owner');
  expect(owner).toHaveLength(1);
  expect(owner[0]).toMatchObject({ name: 'Alice', isActive: true });
  expect(state.members).toHaveLength(1);
  const ownerMemberId = owner[0]!.id;
  expect(state.expenseId).toBe(oldExpense.id);
  assertPersonalFlightView(state.expense, state.expenseId, ownerMemberId);
  assertMigratedFlightProjection(state.after, original, state.expenseId, ownerMemberId);
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/expenses/${state.expenseId}/?$`));
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('機票');
  await expect(amountInput(page)).toHaveValue(/^(?:8000|8,000)(?:\.00)?$/);
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(/^TWD\b/);
  await expect(dateInput(page)).toHaveValue('2027/01/15');
  await expect(page.getByRole('radio', { name: 'Alice', exact: true })).toBeChecked();
  await expect(page.getByRole('radio').and(page.locator(':checked'))).toHaveCount(1);
  await expect(page.getByRole('checkbox', { name: 'Alice', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox').and(page.locator(':checked'))).toHaveCount(1);
  const read = await callApi(authority, 'GET', `/api/trips/${tripId}/expenses/${state.expenseId}`);
  expect(read.status(), 'Original migrated flight UUID remains readable').toBe(200);
  expect(await read.json()).toEqual(state.expense);
  const rows = await authority.db.query(
    'SELECT id,owner_id,trip_id,category_id,item,amount_minor::text,currency_code,minor_unit,spent_on::text,created_at,updated_at FROM expenses WHERE id=$1',
    [state.expenseId],
  );
  expect(rows.rows, 'All pre-migration expense fields remain unchanged').toEqual([oldExpense]);
  const stats = await authority.db.query(
    'SELECT count(*)::text AS expense_count,currency_code,sum(amount_minor)::text AS amount_minor FROM expenses WHERE trip_id=$1 GROUP BY currency_code ORDER BY currency_code',
    [tripId],
  );
  expect(stats.rows).toEqual(authority.get('splitting:legacyStatsBefore'));
  assertMigratedFlightProjection(
    await readBrowserSplittingSnapshot(authority),
    original,
    state.expenseId,
    ownerMemberId,
  );
}
