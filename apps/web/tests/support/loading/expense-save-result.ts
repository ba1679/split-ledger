import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import { omitFields } from './operation-business-result.js';
import type { ExpenseSaveDraft } from './expense-save-draft.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function assertExpenseSaveResult(world: LedgerWorld): Promise<void> {
  const state = world.get<ExpenseSaveDraft>('loading:expenseSave'),
    ui = managementUI(world),
    page = ui.page;
  expect(world.get('loading:expenseRetryReady')).toEqual({
    failedAttempts: 1,
    originalId: state.original.id,
  });
  expect(state.responses.map((response) => response.status())).toEqual([400, 200]);
  expect(ui.writes.length).toBe(2);
  expect(
    ui.writes.every(
      (request) =>
        request.method() === 'PATCH' && new URL(request.url()).pathname === state.data.path,
    ),
  ).toBe(true);
  const after = await managementSnapshot(world);
  expect(after.expenses.length).toBe(1);
  expect(after.expenses[0]!.id).toBe(state.original.id);
  expect(String(after.expenses[0]!.amount_minor)).toBe('200');
  expect(omitFields(after.expenses[0]!, ['amount_minor', 'updated_at'])).toEqual(
    omitFields(state.before.expenses[0]!, ['amount_minor', 'updated_at']),
  );
  expect(omitFields(after.trips[0]!, ['accounting_revision', 'updated_at'])).toEqual(
    omitFields(state.before.trips[0]!, ['accounting_revision', 'updated_at']),
  );
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(state.before.trips[0]!.accounting_revision)) + 1n),
  );
  for (const key of [
    'members',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
    'receipts',
    'reservations',
    'categories',
  ] as const)
    expect(after[key]).toEqual(state.before[key]);
  const response = await ownerRead(world, state.data.path);
  expect(response.status()).toBe(200);
  const expense = await response.json();
  expect(omitFields(expense, ['amount', 'shares', 'updatedAt'])).toEqual(
    omitFields(state.original as unknown as Record<string, unknown>, [
      'amount',
      'shares',
      'updatedAt',
    ]),
  );
  expect(expense.amount).toBe('200');
  expect(expense.shares.length).toBe(2);
  expect(expense.shares.map((share: { memberId: string }) => share.memberId).sort()).toEqual(
    state.draft.shares,
  );
  for (const share of expense.shares)
    expect(share.amount).toEqual({ numerator: '100', denominator: '1', minorUnit: 0 });
  const balance = await ownerRead(world, `/api/trips/${state.data.tripId}/settlement`);
  expect(balance.status()).toBe(200);
  assertMemberBalanceProjection(
    after,
    await balance.json(),
    [
      { 成員: 'Alice', 幣別: 'JPY', 淨額: '100' },
      { 成員: 'Amy', 幣別: 'JPY', 淨額: '-100' },
    ],
    (name) => String(after.members.find((member) => member.name === name)!.id),
  );
  await expect(page).toHaveURL(new RegExp(`/trips/${state.data.tripId}/?$`));
  const row = page.locator(`a[href="/trips/${state.data.tripId}/expenses/${state.original.id}"]`);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('點心');
  await expect(row).toContainText('JPY 200');
  await expect(row).toContainText('2027-03-11');
  const net = page.getByRole('region', { name: '成員淨額', exact: true });
  await expect(net.getByRole('group', { name: 'Alice JPY', exact: true })).toContainText('JPY 100');
  await expect(net.getByRole('group', { name: 'Amy JPY', exact: true })).toContainText('JPY -100');
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  const untouched = world.get<{ id: string; before: TripManagementSnapshot }>(
    'loading:untouchedTrip',
  );
  expect(await managementSnapshot(world, untouched.id)).toEqual(untouched.before);
  await assertOtherDataUnchanged(world);
  expect(await managementSnapshot(world)).toEqual(after);
}
