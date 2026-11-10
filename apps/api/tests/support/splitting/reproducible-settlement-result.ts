import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import type { AccessSettlementView } from './access-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const reproducibleSettlementPhrase = '相同資料的結算安排可重現';

export interface DeterministicSettlementView extends AccessSettlementView {
  balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
  explanation: string;
  directArrangementCount: number;
  suggestedArrangementCount: number;
}

function requireCompleteView(view: DeterministicSettlementView): void {
  expect(view.accountingRevision).toMatch(/^(?:0|[1-9]\d*)$/);
  expect(typeof view.simplifyDebts).toBe('boolean');
  expect(Array.isArray(view.balances)).toBe(true);
  expect(Array.isArray(view.arrangements)).toBe(true);
  expect(typeof view.explanation).toBe('string');
  for (const count of [view.directArrangementCount, view.suggestedArrangementCount]) {
    expect(Number.isInteger(count) && count >= 0).toBe(true);
  }
  expect(view.suggestedArrangementCount).toBe(view.arrangements.length);
  expect(view.suggestedArrangementCount).toBeLessThanOrEqual(view.directArrangementCount);
}

/** Exact structural comparison deliberately preserves row order and opaque keys. */
export function assertSameSettlementProjection(
  actual: DeterministicSettlementView,
  act: DeterministicSettlementView,
): void {
  requireCompleteView(act);
  requireCompleteView(actual);
  for (const field of [
    'accountingRevision',
    'simplifyDebts',
    'balances',
    'arrangements',
    'explanation',
    'directArrangementCount',
    'suggestedArrangementCount',
  ] as const)
    expect(actual[field], `Repeated GET must preserve ${field}`).toEqual(act[field]);
}

export async function assertReproducibleSettlement(world: LedgerWorld): Promise<void> {
  expect(world.response, 'A single settlement query Act must precede this Then').toBeDefined();
  expect(world.response!.status()).toBe(200);
  const act = world.get<DeterministicSettlementView>('splitting:settlementView');
  const before = world.get<SourceSnapshot>('splitting:before');
  requireCompleteView(act);
  expect(act.accountingRevision).toBe(String(before.trips[0]!.accounting_revision));
  expect(act.simplifyDebts).toBe(before.trips[0]!.simplify_debts);
  expect(await snapshotSplittingSources(world)).toEqual(before);
  for (let read = 0; read < 10; read += 1) {
    const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
    expect(response.status(), `Read-only stability query ${read + 1}`).toBe(200);
    assertSameSettlementProjection((await response.json()) as DeterministicSettlementView, act);
    expect(
      await snapshotSplittingSources(world),
      `Read-only stability query ${read + 1} must preserve all sources and revision`,
    ).toEqual(before);
  }
}
