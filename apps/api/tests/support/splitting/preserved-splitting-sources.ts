import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import type { SourceSnapshot } from './types.js';

export const preservedSplittingSourcesPhrase = '分帳來源紀錄維持操作前內容';
const sourceKeys = ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const;

/** node-postgres parses SQL DATE as local midnight; retain its calendar fields. */
export const dateOnly = (value: unknown): string =>
  value instanceof Date
    ? `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value).slice(0, 10);
const businessRows = (rows: readonly Record<string, unknown>[]) =>
  rows.map(({ created_at: _createdAt, updated_at: _updatedAt, ...row }) => row);

/** Metadata operations may change member names/status or trip mode/revision, never source facts. */
export function assertSplittingSourceRows(before: SourceSnapshot, after: SourceSnapshot): void {
  for (const key of sourceKeys)
    expect(businessRows(after[key]), `Every ${key} business column must remain unchanged`).toEqual(
      businessRows(before[key]),
    );
}

function decimal(minor: unknown, unit: unknown): string {
  const places = Number(unit);
  const digits = BigInt(String(minor))
    .toString()
    .padStart(places + 1, '0');

  return places ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits;
}

export async function assertPreservedSplittingSources(world: LedgerWorld): Promise<void> {
  expect(world.response, 'When must retain the mode/metadata command response').toBeDefined();
  expect(world.response!.status(), 'The source-preserving command must succeed').toBe(200);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertSplittingSourceRows(before, after);
  const tripId = splittingTripId(world);
  const get = async (path: string) => {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/${path}`);
    expect(response.status(), `Owner must be able to reread ${path}`).toBe(200);

    return response.json();
  };
  const expenseList = await get('expenses');
  expect(expenseList.totalCount).toBe(before.expenses.length);
  expect(expenseList.nextCursor).toBeNull();
  expect(expenseList.items.map((row: { id: string }) => row.id).sort()).toEqual(
    before.expenses.map((row) => row.id).sort(),
  );
  for (const expense of before.expenses) {
    const category =
      expense.category_id === null
        ? null
        : (
            await world.db.query('SELECT id,name FROM categories WHERE id=$1 AND owner_id=$2', [
              expense.category_id,
              world.users.get('甲')!.id,
            ])
          ).rows[0];
    const expected = {
      id: expense.id,
      tripId: expense.trip_id,
      item: expense.item,
      amount: decimal(expense.amount_minor, expense.minor_unit),
      currencyCode: expense.currency_code,
      minorUnit: Number(expense.minor_unit),
      spentOn: dateOnly(expense.spent_on),
      category,
      payerMemberId: expense.payer_member_id,
      shares: before.shares
        .filter((row) => row.expense_id === expense.id)
        .map((row) => ({
          memberId: String(row.member_id),
          amount: independentSplittingOracle.share(
            before,
            String(expense.id),
            String(row.member_id),
          ),
        }))
        .sort((a, b) => a.memberId.localeCompare(b.memberId)),
    };
    expect(expenseList.items.find((row: { id: string }) => row.id === expense.id)).toMatchObject(
      expected,
    );
    expect(await get(`expenses/${expense.id}`)).toMatchObject(expected);
  }
  const repayments = before.repayments.map(historicalRepaymentProjection);
  const repaymentList = await get('repayments');
  expect(repaymentList.items.map((row: { id: string }) => row.id).sort()).toEqual(
    repayments.map((row) => row.id).sort(),
  );
  for (const repayment of repayments) {
    // Technical timestamps may refresh; all payment facts must be preserved.
    const { createdAt: _createdAt, ...facts } = repayment;
    expect(
      repaymentList.items.find((row: { id: string }) => row.id === repayment.id),
    ).toMatchObject(facts);
    expect(await get(`repayments/${repayment.id}`)).toMatchObject(facts);
  }
  for (const settlement of before.settlements) {
    const body = await get(`settlements/${settlement.id}`);
    const payment = repayments.find((row) => row.settlementId === settlement.id);
    expect(payment, 'A historical settlement must retain its unique payment').toBeDefined();
    const { createdAt: _createdAt, ...paymentFacts } = payment!;
    expect(body).toMatchObject({
      id: settlement.id,
      tripId: settlement.trip_id,
      arrangementKey: settlement.arrangement_key,
      sourceRevision: String(settlement.source_revision),
      simplifyDebts: settlement.simplify_debts,
      debtorMemberId: settlement.debtor_member_id,
      creditorMemberId: settlement.creditor_member_id,
      currencyCode: settlement.currency_code,
      obligation: {
        numerator: String(settlement.obligation_numerator),
        denominator: String(settlement.obligation_denominator),
        minorUnit: Number(settlement.obligation_minor_unit),
      },
      repayment: paymentFacts,
    });
    expect(Array.isArray(body.adjustments)).toBe(true);
    expect(
      body.adjustments.sort((a: { memberId: string }, b: { memberId: string }) =>
        a.memberId.localeCompare(b.memberId),
      ),
    ).toEqual(
      before.adjustments
        .filter((row) => row.settlement_id === settlement.id)
        .map((row) => ({
          memberId: String(row.member_id),
          currencyCode: row.currency_code,
          amount: {
            numerator: String(row.numerator),
            denominator: String(row.denominator),
            minorUnit: Number(row.minor_unit),
          },
        }))
        .sort((a, b) => a.memberId.localeCompare(b.memberId)),
    );
  }
  expect(
    await snapshotSplittingSources(world),
    'Owner verification reads must not modify any source',
  ).toEqual(after);
}
