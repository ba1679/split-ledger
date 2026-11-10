import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { expenseLink } from '../expense-helpers.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { sharedExpenseSaveKey, type SharedExpenseSave } from './save-shared-expense.js';
import { assertMemberShareDisplay } from './expense-share-display-result.js';

export const nonsharingPayerResultPhrase =
  '點心只有 Amy 與 Bob 各分攤 JPY 50 且 Alice 應收 JPY 100';

/** Independent, complete projection: a payer need not appear in the share set. */
export function assertNonsharingPayerProjection(
  snapshot: BrowserSplittingSnapshot,
  expenseId: string,
): void {
  const member = (name: string) => {
    const rows = snapshot.sources.members.filter((row) => row.name === name);
    expect(rows).toHaveLength(1);

    return String(rows[0]!.id);
  };
  const alice = member('Alice');
  const amy = member('Amy');
  const bob = member('Bob');
  expect(snapshot.expenses.items).toHaveLength(1);
  const expense = snapshot.expenses.items[0]!;
  expect(expense).toMatchObject({
    id: expenseId,
    item: '點心',
    currencyCode: 'JPY',
    payerMemberId: alice,
  });
  expect(expense.amount).toBe('100');
  expect(expense.shares.map((share) => share.memberId).sort()).toEqual([amy, bob].sort());
  for (const share of expense.shares)
    expect(
      independentSplittingOracle.equal(share.amount, {
        numerator: '50',
        denominator: '1',
        minorUnit: 0,
      }),
    ).toBe(true);
  expect(snapshot.sources.expenses).toHaveLength(1);
  expect(snapshot.sources.expenses[0]).toMatchObject({
    id: expenseId,
    payer_member_id: alice,
    amount_minor: '100',
    currency_code: 'JPY',
    minor_unit: 0,
  });
  expect(snapshot.sources.shares.map((row) => [row.expense_id, row.member_id]).sort()).toEqual(
    [
      [expenseId, amy],
      [expenseId, bob],
    ].sort(),
  );
  for (const id of [amy, bob])
    expect(
      independentSplittingOracle.equal(
        independentSplittingOracle.share(snapshot.sources, expenseId, id),
        { numerator: '50', denominator: '1', minorUnit: 0 },
      ),
    ).toBe(true);
  expect(snapshot.sources.repayments).toEqual([]);
  expect(snapshot.sources.settlements).toEqual([]);
  expect(snapshot.sources.adjustments).toEqual([]);
  expect(
    snapshot.settlement.balances.map((row) => [row.memberId, row.currencyCode]).sort(),
  ).toEqual(
    [
      [alice, 'JPY'],
      [amy, 'JPY'],
      [bob, 'JPY'],
    ].sort(),
  );
  for (const row of snapshot.settlement.balances)
    expect(
      independentSplittingOracle.equal(row.netAmount, {
        numerator: row.memberId === alice ? '100' : '-50',
        denominator: '1',
        minorUnit: 0,
      }),
    ).toBe(true);
  expect(snapshot.settlement.arrangements).toHaveLength(2);
  expect(
    snapshot.settlement.arrangements
      .map((row) => [row.debtorMemberId, row.creditorMemberId, row.currencyCode])
      .sort(),
  ).toEqual(
    [
      [amy, alice, 'JPY'],
      [bob, alice, 'JPY'],
    ].sort(),
  );
  expect(new Set(snapshot.settlement.arrangements.map((row) => row.key)).size).toBe(2);
  for (const row of snapshot.settlement.arrangements) {
    expect(row.key).not.toBe('');
    expect(
      independentSplittingOracle.equal(row.amount, {
        numerator: '50',
        denominator: '1',
        minorUnit: 0,
      }),
    ).toBe(true);
  }
}

/** No second Act: inspect the saved ledger and refresh authority via GET only. */
export async function assertNonsharingPayer(page: Page, world: LedgerWorld): Promise<void> {
  const saved = world.get<SharedExpenseSave>(sharedExpenseSaveKey);
  expect(saved.outcome).toBe('saved');
  expect(saved.status).toBe(201);
  expect(saved.expenseId).not.toBeNull();
  assertNonsharingPayerProjection(saved.after, saved.expenseId!);
  const tripId = splittingTripId(world);
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/?$`));
  const card = expenseLink(page, '點心');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(/Alice/);
  await assertMemberShareDisplay(card, ['Amy', 'Bob'], 'JPY 50');
  for (const name of ['Amy', 'Bob'])
    await expect(card).toContainText(new RegExp(`${name}\\s*(?:[：:]\\s*)?JPY\\s*50(?![\\d.])`));
  await expect(card).not.toContainText(/Alice\s*(?:[：:]\s*)?JPY\s*50(?![\d.])/);
  const reply = await callApi(world, 'GET', `/api/trips/${tripId}/expenses/${saved.expenseId}`);
  expect(reply.status()).toBe(200);
  expect(await reply.json()).toEqual(saved.after.expenses.items[0]);
  const current = await readBrowserSplittingSnapshot(world);
  expect(current).toEqual(saved.after);
  assertNonsharingPayerProjection(current, saved.expenseId!);
}
