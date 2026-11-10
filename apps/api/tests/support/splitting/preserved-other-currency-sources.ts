import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { readAccessSettlement } from './access-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from './expense-arrangements-result.js';
import type { SourceSnapshot } from './types.js';

export const preservedOtherCurrencySourcesPhrase = '先前還款與其他幣別來源保持不變';

export function assertPreservedOtherCurrencyRows(
  before: SourceSnapshot,
  after: SourceSnapshot,
  currency: string,
): void {
  for (const old of before.repayments) {
    expect(
      after.repayments.filter((row) => row.id === old.id),
      'Every previous payment column must remain unchanged',
    ).toEqual([old]);
  }
  // An independent payment cannot change any expense/share or settlement history,
  // including sources in the payment currency.
  for (const key of ['expenses', 'shares', 'settlements', 'adjustments'] as const)
    expect(after[key], `Independent payment must preserve ${key}`).toEqual(before[key]);
  expect(after.repayments.filter((row) => row.currency_code !== currency)).toEqual(
    before.repayments.filter((row) => row.currency_code !== currency),
  );
}

export async function assertPreservedOtherCurrencySources(world: LedgerWorld): Promise<void> {
  expect(world.response!.status(), 'Independent payment must have been accepted').toBe(201);
  const before = world.get<SourceSnapshot>('splitting:before');
  const request = world.get<{ currencyCode: string }>('splitting:repaymentRequest');
  const after = await snapshotSplittingSources(world);
  assertPreservedOtherCurrencyRows(before, after, request.currencyCode);
  const expected = directExpenseArrangements(before).filter(
    (row) => row.currencyCode !== request.currencyCode,
  );
  const view = await readAccessSettlement(world);
  assertExactArrangementSet(
    view.arrangements.filter((row) => row.currencyCode !== request.currencyCode),
    expected,
  );
  expect(await snapshotSplittingSources(world), 'Verification must not modify any source').toEqual(
    after,
  );
}
