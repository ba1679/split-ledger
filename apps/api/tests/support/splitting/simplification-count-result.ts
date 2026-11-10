import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources, independentSplittingOracle } from './expense-fixture.js';
import {
  directExpenseArrangements,
  assertExactArrangementSet,
} from './expense-arrangements-result.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { AccessSettlementView } from './access-fixture.js';
import type { SourceSnapshot } from './types.js';

export const simplificationCountPhrase = '簡化建議的付款筆數不多於直接安排';
type Edge = ReturnType<typeof directExpenseArrangements>[number];
interface Fraction {
  n: bigint;
  d: bigint;
}
const amount = (value: ExactAmount): Fraction => ({
  n: BigInt(value.numerator),
  d: BigInt(value.denominator) * 10n ** BigInt(value.minorUnit),
});
const compare = (a: Fraction, b: Fraction) => a.n * b.d - b.n * a.d;
const subtract = (a: Fraction, b: Fraction): Fraction => ({
  n: a.n * b.d - b.n * a.d,
  d: a.d * b.d,
});
const exact = (value: Fraction): ExactAmount => ({
  numerator: value.n.toString(),
  denominator: value.d.toString(),
  minorUnit: 0,
});

/** Independent source-only candidate: re-sort the remaining amounts after each pairing. */
export function independentNetCandidate(snapshot: SourceSnapshot): Edge[] {
  const balances = snapshotExactBalances(snapshot);
  const result: Edge[] = [];
  for (const currencyCode of [...new Set(balances.map((row) => row.currencyCode))].sort()) {
    const rows = balances.filter((row) => row.currencyCode === currencyCode);
    const debtors = rows
      .filter((row) => BigInt(row.amount.numerator) < 0n)
      .map((row) => ({
        id: row.memberId,
        value: amount({ ...row.amount, numerator: (-BigInt(row.amount.numerator)).toString() }),
      }));
    const creditors = rows
      .filter((row) => BigInt(row.amount.numerator) > 0n)
      .map((row) => ({ id: row.memberId, value: amount(row.amount) }));
    const order = (a: (typeof debtors)[number], b: (typeof debtors)[number]) => {
      const difference = compare(b.value, a.value);

      return difference < 0n ? -1 : difference > 0n ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    };
    while (debtors.length && creditors.length) {
      debtors.sort(order);
      creditors.sort(order);
      const debtor = debtors[0]!,
        creditor = creditors[0]!;
      const payment = compare(debtor.value, creditor.value) <= 0n ? debtor.value : creditor.value;
      result.push({
        debtorMemberId: debtor.id,
        creditorMemberId: creditor.id,
        currencyCode,
        amount: exact(payment),
      });
      debtor.value = subtract(debtor.value, payment);
      creditor.value = subtract(creditor.value, payment);
      if (debtor.value.n === 0n) debtors.shift();
      if (creditor.value.n === 0n) creditors.shift();
    }
    expect(debtors, 'All nonzero debtor balances must be consumed exactly').toEqual([]);
    expect(creditors, 'All nonzero creditor balances must be consumed exactly').toEqual([]);
  }

  return result;
}

export interface CountSettlementView extends AccessSettlementView {
  directArrangementCount: number;
  suggestedArrangementCount: number;
  balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
}

export function assertSimplificationCountProjection(
  snapshot: SourceSnapshot,
  view: CountSettlementView,
): void {
  expect(view.accountingRevision).toBe(String(snapshot.trips[0]!.accounting_revision));
  expect(view.simplifyDebts).toBe(snapshot.trips[0]!.simplify_debts);
  const direct = directExpenseArrangements(snapshot);
  const candidate = independentNetCandidate(snapshot);
  const expected = view.simplifyDebts && candidate.length <= direct.length ? candidate : direct;
  expect(view.directArrangementCount).toBe(direct.length);
  expect(view.suggestedArrangementCount).toBe(expected.length);
  expect(view.suggestedArrangementCount).toBeLessThanOrEqual(view.directArrangementCount);
  assertExactArrangementSet(view.arrangements, expected);
  const balances = snapshotExactBalances(snapshot);
  const keys = view.balances.map((row) => JSON.stringify([row.memberId, row.currencyCode]));
  expect(new Set(keys).size).toBe(keys.length);
  for (const row of view.balances) {
    const wanted = balances.find(
      (item) => item.memberId === row.memberId && item.currencyCode === row.currencyCode,
    );
    expect(wanted, 'No invented member or currency balance').toBeDefined();
    expect(independentSplittingOracle.equal(row.netAmount, wanted!.amount)).toBe(true);
  }
  for (const row of balances.filter((item) => BigInt(item.amount.numerator) !== 0n))
    expect(keys, 'Every nonzero source balance must survive simplification').toContain(
      JSON.stringify([row.memberId, row.currencyCode]),
    );
}

export async function assertSimplificationCount(world: LedgerWorld): Promise<void> {
  expect(world.response, 'The mode change or settlement read must have completed').toBeDefined();
  expect(world.response!.status()).toBe(200);
  const before = await snapshotSplittingSources(world);
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status(), 'Product must expose the settlement projection').toBe(200);
  assertSimplificationCountProjection(before, (await response.json()) as CountSettlementView);
  expect(
    await snapshotSplittingSources(world),
    'Then reads must preserve source facts and revision',
  ).toEqual(before);
}
