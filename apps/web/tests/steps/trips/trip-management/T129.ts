import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../../../api/tests/support/trip-management/context.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../../api/tests/support/trip-management/preservation.js';
import { assertExpenseShareResult } from '../../../../../api/tests/support/splitting/expense-share-result.js';
import { assertMemberBalanceProjection } from '../../../../../api/tests/support/splitting/member-balances-result.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';

Then('早餐成功保存且圖片失敗沒有改壞帳務', async ({ world }) => {
  const ui = managementUI(world),
    page = ui.page;
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /支出.*(?:已保存|已儲存|成功)|(?:已保存|已儲存|已新增).*支出/ }),
  ).toBeVisible();
  await expect(page.getByText('早餐', { exact: true })).toBeVisible();
  await expect(page.getByText('晚餐', { exact: true })).toBeVisible();
  await waitForManagementReads(ui);
  const saved = world.get<{ request: Record<string, unknown>; response: Record<string, unknown> }>(
    'management:breakfastSaved',
  );
  const id = String(saved.request.id),
    tripId = managementTripId(world);
  const before = world.get<TripManagementSnapshot>('management:before');
  const after = await managementSnapshot(world);
  const matches = after.expenses.filter((row) => row.item === '早餐');
  expect(matches).toHaveLength(1);
  expect(matches[0]).toMatchObject({
    id,
    owner_id: world.users.get('Alice')!.id,
    trip_id: tripId,
    amount_minor: '10000',
    minor_unit: 2,
    currency_code: 'TWD',
    payer_member_id: saved.request.payerMemberId,
  });
  expect(after.expenses.filter((row) => row.id !== id)).toEqual(before.expenses);
  expect(after.shares.filter((row) => row.expense_id !== id)).toEqual(before.shares);
  const requested = saved.request.shareMemberIds as string[];
  const shares = requested.map((memberId) => ({ memberId, numerator: 50n, denominator: 1n }));
  assertExpenseShareResult(saved.response, after, id, shares, requested);
  const expense = await ownerRead(world, `/api/trips/${tripId}/expenses/${id}`);
  expect(expense.status()).toBe(200);
  const body = await expense.json();
  expect(body).toMatchObject({
    id,
    item: '早餐',
    amount: '100.00',
    currencyCode: 'TWD',
    minorUnit: 2,
    spentOn: saved.request.spentOn,
  });
  assertExpenseShareResult(body, after, id, shares, requested);
  expect(after.expenses.length).toBe(before.expenses.length + 1);
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(before.trips[0]!.accounting_revision)) + 1n),
  );
  const stableTrip = (row: Record<string, unknown>) => {
    const { accounting_revision: _revision, updated_at: _updated, ...rest } = row;

    return rest;
  };
  expect(stableTrip(after.trips[0]!)).toEqual(stableTrip(before.trips[0]!));
  for (const key of [
    'members',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
    'reservations',
    'receipts',
    'categories',
  ] as const)
    expect(after[key]).toEqual(before[key]);
  const totals = await ownerRead(world, `/api/trips/${tripId}/totals`);
  expect(totals.status()).toBe(200);
  expect(
    (await totals.json()).totals.sort((a: { currencyCode: string }, b: { currencyCode: string }) =>
      a.currencyCode.localeCompare(b.currencyCode),
    ),
  ).toEqual([
    { currencyCode: 'JPY', amount: '5000', minorUnit: 0 },
    { currencyCode: 'TWD', amount: '700.00', minorUnit: 2 },
  ]);
  const settlement = await ownerRead(world, `/api/trips/${tripId}/settlement`);
  expect(settlement.status()).toBe(200);
  const member = (name: string) => String(after.members.find((row) => row.name === name)!.id);
  assertMemberBalanceProjection(
    after,
    await settlement.json(),
    [
      { 成員: 'Alice', 幣別: 'TWD', 淨額: '350' },
      { 成員: 'Amy', 幣別: 'TWD', 淨額: '-350' },
    ],
    member,
  );
  const image = await ownerRead(
    world,
    `/api/trips/${tripId}/thumbnail/${after.trips[0]!.thumbnail_revision}`,
  );
  expect(image.status()).toBe(200);
  expect(await image.body()).toEqual(world.get('management:originalImage'));
  expect(ui.writes.length).toBe(1);
  expect(await managementSnapshot(world)).toEqual(after);
  await assertOtherDataUnchanged(world);
});
