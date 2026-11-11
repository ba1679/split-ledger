import { sourceDateOnly, sourceTimestamp } from './source-temporal.js';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { assertRejectedSplittingOperation } from './rejection.js';
import { invalidExpenseUpdateProblems } from './update-invalid-expense-command.js';
import type { SourceSnapshot } from './types.js';

export const rejectedExpenseUpdatePhrase = '支出修改被拒絕且舊分攤與安排完全保留';

function decimal(amount: bigint, unit: number): string {
  const digits = amount.toString().padStart(unit + 1, '0');

  return unit ? `${digits.slice(0, -unit)}.${digits.slice(-unit)}` : digits;
}

export function assertUnchangedExpenseProjection(
  actual: Record<string, unknown>,
  row: Record<string, unknown>,
  before: SourceSnapshot,
): void {
  expect(actual).toMatchObject({
    id: row.id,
    tripId: row.trip_id,
    item: row.item,
    payerMemberId: row.payer_member_id,
    currencyCode: row.currency_code,
    minorUnit: row.minor_unit,
    amount: decimal(BigInt(String(row.amount_minor)), Number(row.minor_unit)),
    spentOn: sourceDateOnly(row.spent_on),
    category: row.category_id === null ? null : expect.objectContaining({ id: row.category_id }),
    createdAt: sourceTimestamp(row.created_at),
    updatedAt: sourceTimestamp(row.updated_at),
  });
  expect(actual.shares).toEqual(
    before.shares
      .filter((share) => share.expense_id === row.id)
      .map((share) => ({
        memberId: share.member_id,
        amount: independentSplittingOracle.share(before, String(row.id), String(share.member_id)),
      }))
      .sort((a, b) => String(a.memberId).localeCompare(String(b.memberId))),
  );
}

export async function assertRejectedExpenseUpdate(world: LedgerWorld): Promise<void> {
  const problem = world.get<string>('splitting:expenseValidationProblem');
  expect(invalidExpenseUpdateProblems as readonly string[]).toContain(problem);
  await assertRejectedSplittingOperation(
    world,
    problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
  );
  const before = world.get<SourceSnapshot>('splitting:before');
  const tripId = splittingTripId(world);
  const read = async (suffix: string): Promise<Record<string, unknown>> => {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}${suffix}`);
    expect(response.status(), `Unchanged projection GET ${suffix} must remain readable`).toBe(200);

    return response.json();
  };
  const projections: unknown[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const list = await read('/expenses');
    const items = list.items as Record<string, unknown>[];
    expect(items).toHaveLength(before.expenses.length);
    expect(list.totalCount).toBe(before.expenses.length);
    for (const row of before.expenses) {
      const detail = await read(`/expenses/${row.id}`);
      assertUnchangedExpenseProjection(detail, row, before);
      const item = items.find((candidate) => candidate.id === row.id);
      expect(item).toEqual(detail);
    }
    const totals = await read('/totals');
    const currencies = [...new Set(before.expenses.map((row) => String(row.currency_code)))].sort();
    expect(totals.totals).toEqual(
      currencies.map((currencyCode) => {
        const rows = before.expenses.filter((row) => row.currency_code === currencyCode);
        const minorUnit = Math.max(...rows.map((row) => Number(row.minor_unit)));
        const amount = rows.reduce(
          (sum, row) =>
            sum +
            BigInt(String(row.amount_minor)) * 10n ** BigInt(minorUnit - Number(row.minor_unit)),
          0n,
        );

        return { currencyCode, minorUnit, amount: decimal(amount, minorUnit) };
      }),
    );
    const settlement = await read('/settlement');
    expect(settlement).toMatchObject({
      accountingRevision: String(before.trips[0]!.accounting_revision),
      simplifyDebts: before.trips[0]!.simplify_debts,
    });
    const balances = settlement.balances as {
      memberId: string;
      currencyCode: string;
      netAmount: ExactAmount;
    }[];
    expect(new Set(balances.map((row) => `${row.memberId}:${row.currencyCode}`)).size).toBe(
      balances.length,
    );
    for (const balance of balances) {
      expect(currencies).toContain(balance.currencyCode);
      expect(before.members.some((member) => member.id === balance.memberId)).toBe(true);
    }
    for (const currency of currencies) {
      for (const member of before.members) {
        const expected = independentSplittingOracle.balance(before, String(member.id), currency);
        const actual = balances.find(
          (balance) => balance.memberId === member.id && balance.currencyCode === currency,
        );
        if (!actual) expect(BigInt(expected.numerator)).toBe(0n);
        else expect(independentSplittingOracle.equal(actual.netAmount, expected)).toBe(true);
      }
    }
    // This DSL's Given has one source and no payment history: each non-self share is a direct debt.
    expect(before.repayments).toEqual([]);
    expect(before.adjustments).toEqual([]);
    expect(before.expenses).toHaveLength(1);
    const expense = before.expenses[0]!;
    const expectedArrangements = before.shares
      .filter((share) => share.member_id !== expense.payer_member_id)
      .map((share) => ({
        debtorMemberId: share.member_id,
        creditorMemberId: expense.payer_member_id,
        currencyCode: expense.currency_code,
        amount: independentSplittingOracle.share(
          before,
          String(expense.id),
          String(share.member_id),
        ),
      }));
    const arrangements = settlement.arrangements as Record<string, unknown>[];
    expect(arrangements).toHaveLength(expectedArrangements.length);
    expect(arrangements).toEqual(
      expect.arrayContaining(
        expectedArrangements.map((row) =>
          expect.objectContaining({ ...row, key: expect.any(String) }),
        ),
      ),
    );
    expect(settlement.directArrangementCount).toBe(expectedArrangements.length);
    expect(settlement.suggestedArrangementCount).toBe(expectedArrangements.length);
    projections.push({ list, totals, settlement });
  }
  expect(
    projections[1],
    'Repeated reads must preserve the original arrangements, keys, and totals',
  ).toEqual(projections[0]);
  expect(
    await snapshotSplittingSources(world),
    'Projection reads must never mutate preserved sources',
  ).toEqual(before);
}
