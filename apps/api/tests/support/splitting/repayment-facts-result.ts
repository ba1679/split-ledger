import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import type { SourceSnapshot } from './types.js';

export const repaymentFactsPhrase = '實際還款保留各次付款事實';

export function assertRepaymentFactItems(
  actual: unknown,
  rows: readonly Record<string, unknown>[],
): ReturnType<typeof historicalRepaymentProjection>[] {
  const expected = rows.map(historicalRepaymentProjection).sort((a, b) => {
    if (a.paidOn !== b.paidOn) return a.paidOn < b.paidOn ? 1 : -1;

    return String(a.id) < String(b.id) ? 1 : String(a.id) === String(b.id) ? 0 : -1;
  });

  expect(
    actual,
    'The history must retain every individual payment in newest date/id order',
  ).toEqual(expected);

  return expected;
}

export async function assertRepaymentFacts(world: LedgerWorld): Promise<void> {
  expect(world.response!.status(), 'Repayment history query must succeed').toBe(200);
  const source = world.get<SourceSnapshot>('splitting:sourceSnapshot');
  const snapshot = await snapshotSplittingSources(world);
  expect(snapshot, 'The history query must not modify accounting sources').toEqual(source);
  const rows = snapshot.repayments;
  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row.payer_member_id).toBe(splittingMemberId(world, 'Amy'));
    expect(row.payee_member_id).toBe(splittingMemberId(world, 'Alice'));
    expect(row.currency_code).toBe('JPY');
    expect(row.minor_unit).toBe(0);
    expect(row.kind).toBe('independent');
    expect(row.settlement_id).toBeNull();
  }
  expect(rows.map((row) => String(row.amount_minor)).sort()).toEqual(['400', '600']);
  const body = world.get<{ items: unknown }>('splitting:reply');
  const expected = assertRepaymentFactItems(body.items, rows);
  expect(new Set(expected.map((row) => row.id)).size).toBe(2);
  for (const repayment of expected) {
    const response = await callApi(
      world,
      'GET',
      `/api/trips/${splittingTripId(world)}/repayments/${repayment.id}`,
    );
    expect(response.status(), 'Every payment must remain individually readable').toBe(200);
    expect(await response.json()).toEqual(repayment);
  }
  expect(
    await snapshotSplittingSources(world),
    'Verification reads must preserve all facts',
  ).toEqual(snapshot);
}
