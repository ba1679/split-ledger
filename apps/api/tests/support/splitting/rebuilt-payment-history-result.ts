import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import type { AccessSettlementView } from './access-fixture.js';
import { snapshotSplittingSources, independentSplittingOracle } from './expense-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from './expense-arrangements-result.js';
import { assertStatusBalances } from './member-status-result.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const rebuiltPaymentHistoryPhrase = '最新實付後的直接與簡化安排皆依來源重建';

/** A mode command changes metadata only; every historical source field is immutable. */
export function assertHistoryModeChange(
  before: SourceSnapshot,
  after: SourceSnapshot,
  mode: boolean,
): void {
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const)
    expect(after[key], `Mode change must preserve every ${key} field`).toEqual(before[key]);
  expect(before.trips).toHaveLength(1);
  expect(after.trips).toHaveLength(1);
  const trip = after.trips[0]!;
  expect(trip.simplify_debts).toBe(mode);
  expect(BigInt(String(trip.accounting_revision))).toBe(
    BigInt(String(before.trips[0]!.accounting_revision)) + 1n,
  );
  expect(trip).toEqual({
    ...before.trips[0],
    simplify_debts: mode,
    accounting_revision: trip.accounting_revision,
    updated_at: trip.updated_at,
  });
}

export async function assertRebuiltPaymentHistory(world: LedgerWorld): Promise<void> {
  expect(world.response?.status(), 'Mode PATCH must succeed').toBe(200);
  const mode = world.get<boolean>('splitting:simplifyDebts');
  const before = world.get<SourceSnapshot>('splitting:before');
  expect(before).toEqual(world.get<SourceSnapshot>('splitting:historySnapshot'));
  const after = await snapshotSplittingSources(world);
  assertHistoryModeChange(before, after, mode);
  const revision = String(after.trips[0]!.accounting_revision);
  expect(world.get('splitting:reply')).toMatchObject({
    simplifyDebts: mode,
    accountingRevision: revision,
  });
  const alice = splittingMemberId(world, 'Alice');
  const amy = splittingMemberId(world, 'Amy');
  const bob = splittingMemberId(world, 'Bob');
  const expected = [
    { currencyCode: 'JPY', amount: { numerator: '70', denominator: '3', minorUnit: 0 } },
    { currencyCode: 'TWD', amount: { numerator: '300', denominator: '1', minorUnit: 0 } },
  ].map((row) => ({ ...row, debtorMemberId: bob, creditorMemberId: alice }));
  // This fixture has only one debtor/creditor in each currency, so both modes
  // have the same unique answer. No second mode-switch Act belongs in Then.
  assertExactArrangementSet(directExpenseArrangements(after), expected);
  for (const currency of ['JPY', 'TWD'])
    expect(independentSplittingOracle.balance(after, amy, currency).numerator).toBe('0');
  for (let read = 0; read < 2; read++) {
    const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
    expect(response.status(), 'Product must reconstruct settlement from immutable history').toBe(
      200,
    );
    const view = (await response.json()) as AccessSettlementView & {
      balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
    };
    expect(view.simplifyDebts).toBe(mode);
    expect(view.accountingRevision).toBe(revision);
    assertExactArrangementSet(view.arrangements, expected);
    assertStatusBalances(before, after, view.balances);
  }
  expect(
    await snapshotSplittingSources(world),
    'Repeated projection reads cannot reapply adjustments',
  ).toEqual(after);
}
