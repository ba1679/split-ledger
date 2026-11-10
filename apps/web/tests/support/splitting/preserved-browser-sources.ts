import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { fixtureMinorAmount } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { confirmedOverpaymentKey, type ConfirmedOverpayment } from './confirm-overpayment.js';
import { simplificationToggleKey, type SimplificationToggle } from './toggle-simplification.js';
import type { BrowserOverpaymentWarning } from './overpayment-warning.js';

export const preservedBrowserSourcesPhrase = '來源支出與先前實付紀錄保持不變';

type RepaymentCommand = BrowserOverpaymentWarning['request'];

const byId = <T extends Record<string, unknown>>(rows: readonly T[]): T[] =>
  [...rows].sort((left, right) => String(left.id).localeCompare(String(right.id)));

/** Full facts, including original timestamps and exact share representations, remain immutable. */
export function assertPreservedBrowserSources(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  addition?: RepaymentCommand,
): void {
  expect(
    after.expenses,
    'Every original expense field and exact share must remain unchanged',
  ).toEqual(before.expenses);
  for (const key of ['expenses', 'shares', 'members', 'settlements', 'adjustments'] as const)
    expect(after.sources[key], `Financial operation must preserve original ${key}`).toEqual(
      before.sources[key],
    );
  expect(after.totals).toEqual(before.totals);
  const addedId = addition?.id;
  expect(
    byId(after.repayments.items.filter((row) => row.id !== addedId)),
    'Prior repayment DTOs must retain every original field',
  ).toEqual(byId(before.repayments.items));
  expect(
    after.sources.repayments.filter((row) => row.id !== addedId),
    'Prior persisted repayment facts cannot be rewritten or removed',
  ).toEqual(before.sources.repayments);
  expect(after.repayments.items).toHaveLength(before.repayments.items.length + (addition ? 1 : 0));
  expect(after.sources.repayments).toHaveLength(
    before.sources.repayments.length + (addition ? 1 : 0),
  );
  if (addition) {
    expect(before.repayments.items.some((row) => row.id === addition.id)).toBe(false);
    const saved = after.sources.repayments.filter((row) => row.id === addition.id);
    expect(saved, 'Only the explicitly confirmed repayment may be added').toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: addition.id,
      payer_member_id: addition.payerMemberId,
      payee_member_id: addition.payeeMemberId,
      currency_code: addition.currencyCode,
      minor_unit: 0,
      kind: 'independent',
      settlement_id: null,
    });
    expect(BigInt(String(saved[0]!.amount_minor))).toBe(fixtureMinorAmount(addition.amount, 0));
    const expected = historicalRepaymentProjection(saved[0]!);
    expect(expected.tripId).toBe(before.expenses.items[0]!.tripId);
    expect(expected.paidOn).toBe(addition.paidOn);
    expect(after.repayments.items.find((row) => row.id === addition.id)).toEqual(expected);
  }
}

/** The Act captured its baseline after all Given facts, including earlier independent payments. */
export async function assertBrowserSourcesRemainUnchanged(world: LedgerWorld): Promise<void> {
  const hasConfirmation = world.state.has(confirmedOverpaymentKey);
  const hasToggle = world.state.has(simplificationToggleKey);
  expect(
    Number(hasConfirmation) + Number(hasToggle),
    'A supported unique Act must supply its baseline',
  ).toBe(1);
  let before: BrowserSplittingSnapshot;
  let addition: RepaymentCommand | undefined;
  if (hasConfirmation) {
    const act = world.get<ConfirmedOverpayment>(confirmedOverpaymentKey);
    expect(act.status, 'The explicit overpayment confirmation must have saved').toBe(201);
    before = act.before;
    addition = act.original.request;
  } else {
    const act = world.get<SimplificationToggle>(simplificationToggleKey);
    expect(act.outcome, 'The source-preserving mode change must have saved').toBe('saved');
    before = act.before.snapshot;
  }
  const actResponse = world.response;
  try {
    const after = await readBrowserSplittingSnapshot(world);
    assertPreservedBrowserSources(before, after, addition);
    expect(
      await readBrowserSplittingSnapshot(world),
      'Read-only verification cannot mutate facts',
    ).toEqual(after);
  } finally {
    world.response = actResponse;
  }
}
