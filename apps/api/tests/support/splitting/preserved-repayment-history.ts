import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import type { SourceSnapshot } from './types.js';

export const preservedRepaymentHistoryPhrase = '已記錄還款保持原事實';

export function assertRepaymentHistoryRows(before: SourceSnapshot, after: SourceSnapshot): void {
  expect(
    before.repayments.length,
    'The Act must begin with an actual recorded payment',
  ).toBeGreaterThan(0);
  for (const key of ['repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Source correction must preserve every historical ${key} column`).toEqual(
      before[key],
    );
}

export async function assertPreservedRepaymentHistory(world: LedgerWorld): Promise<void> {
  const before = world.get<SourceSnapshot>('splitting:before');
  expect([200, 204], 'Source correction must succeed').toContain(world.response!.status());
  const after = await snapshotSplittingSources(world);
  assertRepaymentHistoryRows(before, after);
  const tripId = splittingTripId(world);
  const expected = before.repayments
    .map(historicalRepaymentProjection)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (let read = 0; read < 2; read++) {
    const list = await callApi(world, 'GET', `/api/trips/${tripId}/repayments`);
    expect(list.status(), 'Historical payments must remain in the repayment list').toBe(200);
    const body = await list.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(
      body.items.sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)),
    ).toEqual(expected);
    for (const repayment of expected) {
      const response = await callApi(
        world,
        'GET',
        `/api/trips/${tripId}/repayments/${repayment.id}`,
      );
      expect(response.status(), 'Each historical payment must remain individually readable').toBe(
        200,
      );
      expect(await response.json()).toEqual(repayment);
    }
  }
  expect(
    await snapshotSplittingSources(world),
    'Verification reads must not rewrite payment history',
  ).toEqual(after);
}
