import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import { omitFields } from './operation-business-result.js';
import type { RecoveredOptions } from './options-recovered.js';

export async function assertRecoveredExpense(world: LedgerWorld): Promise<void> {
  const state = world.get<RecoveredOptions>('loading:recoveredOptions'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.savedId).toBeDefined();
  expect(ui.writes.length).toBe(1);
  await expect(page).toHaveURL(new RegExp(`/trips/${state.data.tripId}/?$`));
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /載入.*(?:幣別|分類|成員)|(?:幣別|分類|成員).*載入/ }),
  ).toHaveCount(0);
  const row = page.locator(`a[href="/trips/${state.data.tripId}/expenses/${state.savedId}"]`);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('點心');
  await expect(row).toContainText('JPY 100');
  await expect(row).toContainText('2027-03-11');
  const after = await managementSnapshot(world),
    before = state.before;
  expect(after.expenses.length).toBe(before.expenses.length + 1);
  expect(after.expenses.filter((row) => row.id !== state.savedId)).toEqual(before.expenses);
  expect(after.shares.filter((row) => row.expense_id !== state.savedId)).toEqual(before.shares);
  const expense = after.expenses.find((row) => row.id === state.savedId)!;
  expect(expense).toMatchObject({
    trip_id: state.data.tripId,
    owner_id: world.users.get('Alice')!.id,
    item: '點心',
    currency_code: 'JPY',
    minor_unit: 0,
    payer_member_id: world.splitting.ids.members.get('Alice'),
    category_id: before.categories.find(
      (row) => row.owner_id === world.users.get('Alice')!.id && row.name === '餐飲',
    )!.id,
  });
  expect(String(expense.amount_minor)).toBe('100');
  const shares = after.shares.filter((row) => row.expense_id === state.savedId);
  expect(shares.map((row) => row.member_id).sort()).toEqual(
    [world.splitting.ids.members.get('Alice'), world.splitting.ids.members.get('Amy')].sort(),
  );
  for (const share of shares)
    expect(
      independentSplittingOracle.share(after, state.savedId!, String(share.member_id)),
    ).toEqual({ numerator: '50', denominator: '1', minorUnit: 0 });
  for (const key of [
    'members',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
    'receipts',
    'reservations',
    'categories',
  ] as const)
    expect(after[key]).toEqual(before[key]);
  expect(omitFields(after.trips[0]!, ['accounting_revision', 'updated_at'])).toEqual(
    omitFields(before.trips[0]!, ['accounting_revision', 'updated_at']),
  );
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(before.trips[0]!.accounting_revision)) + 1n),
  );
  const current = await ownerRead(world, `${state.data.path}/${state.savedId}`);
  expect(current.status()).toBe(200);
  expect(await current.json()).toEqual(state.savedBody);
  const balance = await ownerRead(world, `/api/trips/${state.data.tripId}/settlement`);
  expect(balance.status()).toBe(200);
  assertMemberBalanceProjection(
    after,
    await balance.json(),
    after.members.flatMap((member) =>
      ['JPY', 'TWD'].map((currency) => ({
        成員: String(member.name),
        幣別: currency,
        淨額:
          currency === 'JPY'
            ? member.name === 'Alice'
              ? '50'
              : member.name === 'Amy'
                ? '-50'
                : '0'
            : member.name === 'Alice'
              ? '300'
              : member.name === 'Amy'
                ? '-300'
                : '0',
      })),
    ),
    (name) => String(after.members.find((member) => member.name === name)!.id),
  );
  for (const [path, authority] of Object.entries(state.authorities)) {
    const current = await ownerRead(world, path);
    expect(current.status()).toBe(200);
    expect(await current.json()).toEqual(authority);
  }
  expect(state.requests.length).toBe(3);
  expect(state.exchanges.length).toBe(3);
  expect(state.finished).toBe(3);
  expect(state.errors.map(String)).toEqual([]);
  await assertOtherDataUnchanged(world);
  expect(await managementSnapshot(world)).toEqual(after);
  expect(ui.writes.length).toBe(1);
}
