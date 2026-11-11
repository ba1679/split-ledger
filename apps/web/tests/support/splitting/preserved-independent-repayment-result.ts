import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import {
  assertSimplificationCountProjection,
  independentNetCandidate,
  type CountSettlementView,
} from '../../../../api/tests/support/splitting/simplification-count-result.js';
import { expenseAmountChangeKey, type ExpenseAmountChange } from './change-expense-amount.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const preservedIndependentRepaymentPhrase =
  '已保存的 JPY 400 還款仍存在且 Amy 剩餘應付 Alice JPY 400';

/** Both independent mode oracles must reconstruct the latest sources, never the old 600. */
export function assertPreservedIndependentRepayment(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  alice: string,
  amy: string,
): Record<string, unknown> {
  expect(before.sources.repayments).toHaveLength(1);
  expect(after.sources.repayments).toEqual(before.sources.repayments);
  const repayment = historicalRepaymentProjection(before.sources.repayments[0]!);
  expect(repayment).toMatchObject({
    payerMemberId: amy,
    payeeMemberId: alice,
    currencyCode: 'JPY',
    amount: '400',
    paidOn: '2027-03-12',
    kind: 'independent',
    settlementId: null,
  });
  expect(after.repayments.items).toEqual(before.repayments.items);
  expect(after.repayments.items).toEqual([repayment]);
  const advance = after.expenses.items.filter((row) => row.item === '代付');
  expect(advance).toHaveLength(1);
  expect(advance[0]).toMatchObject({
    id: before.expenses.items.find((row) => row.item === '代付')!.id,
    amount: '800',
    currencyCode: 'JPY',
    payerMemberId: alice,
  });
  expect(advance[0]!.shares.map((row) => row.memberId)).toEqual([amy]);
  for (const collection of ['expenses', 'shares'] as const) {
    const twdIds = before.sources.expenses
      .filter((row) => row.currency_code === 'TWD')
      .map((row) => row.id);
    expect(twdIds).toHaveLength(1);
    const retained = (snapshot: BrowserSplittingSnapshot) =>
      snapshot.sources[collection].filter((row) =>
        twdIds.includes(collection === 'expenses' ? row.id : row.expense_id),
      );
    expect(retained(after)).toEqual(retained(before));
  }
  expect(after.expenses.items.filter((row) => row.currencyCode === 'TWD')).toEqual(
    before.expenses.items.filter((row) => row.currencyCode === 'TWD'),
  );
  expect(after.expenses.items.find((row) => row.currencyCode === 'TWD')).toMatchObject({
    amount: '300.00',
    payerMemberId: alice,
  });
  const expected = ['JPY', 'TWD'].map((currencyCode) => ({
    debtorMemberId: amy,
    creditorMemberId: alice,
    currencyCode,
    amount: { numerator: currencyCode === 'JPY' ? '400' : '300', denominator: '1', minorUnit: 0 },
  }));
  assertExactArrangementSet(directExpenseArrangements(after.sources), expected);
  assertExactArrangementSet(independentNetCandidate(after.sources), expected);
  assertExactArrangementSet(after.settlement.arrangements, expected);
  assertSimplificationCountProjection(after.sources, after.settlement as CountSettlementView);

  return repayment;
}

/** Then only reads existing screen/API facts; no mode toggle, navigation or new write. */
export async function assertPreservedIndependentRepaymentScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const change = world.get<ExpenseAmountChange>(expenseAmountChangeKey);
  expect(change.status).toBe(200);
  const after = await readBrowserSplittingSnapshot(world);
  expect(after).toEqual(change.after);
  expect(change.browserSettlement).toEqual(after.settlement);
  expect(after.settlement.accountingRevision).toBe(change.revision);
  const repayment = assertPreservedIndependentRepayment(
    change.before,
    after,
    splittingMemberId(world, 'Alice'),
    splittingMemberId(world, 'Amy'),
  );
  const detail = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/repayments/${String(repayment.id)}`,
  );
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toEqual(repayment);
  const region = page.getByRole('region', { name: '付款安排', exact: true });
  for (const [currency, amount] of [
    ['JPY', '400'],
    ['TWD', '300'],
  ] as const) {
    const group = region.getByRole('group', { name: `Amy 付款給 Alice ${currency}`, exact: true });
    await expect(group).toBeVisible();
    await expect(group).toContainText('Amy');
    await expect(group).toContainText('Alice');
    await expect(group.getByText(`${currency} ${amount}`, { exact: true })).toBeVisible();
  }
  await expect(region).not.toContainText(/JPY\s*600(?:\D|$)/);
  expect(
    await readBrowserSplittingSnapshot(world),
    'Then reads must preserve every source and projection',
  ).toEqual(after);
}
