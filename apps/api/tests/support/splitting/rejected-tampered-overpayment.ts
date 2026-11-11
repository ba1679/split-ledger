import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { readAccessSettlement } from './access-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from './expense-arrangements-result.js';
import { splittingMemberId } from './members-fixture.js';
import type { OverpaymentFixtureRequest } from './overpayment-warning-fixture.js';
import type { SourceSnapshot } from './types.js';

export const rejectedTamperedOverpaymentPhrase = '變造確認未獲接受且沒有保存還款';

/** The contract intentionally permits any client-error status, without choosing its code. */
export function assertTamperedConfirmationRejected(status: number): void {
  expect(status, 'A forged confirmation must be rejected as a client error').toBeGreaterThanOrEqual(
    400,
  );
  expect(
    status,
    'An internal failure does not prove that a forged token was rejected',
  ).toBeLessThan(500);
}

export async function assertRejectedTamperedOverpayment(world: LedgerWorld): Promise<void> {
  assertTamperedConfirmationRejected(world.response!.status());
  const before = world.get<SourceSnapshot>('splitting:before');
  const request = world.get<OverpaymentFixtureRequest>('splitting:repaymentRequest');
  const after = await snapshotSplittingSources(world);
  expect(after.repayments.some((row) => row.id === request.id)).toBe(false);
  expect(after, 'Rejected confirmation must preserve all sources and accounting revision').toEqual(
    before,
  );
  const expected = [
    {
      debtorMemberId: splittingMemberId(world, 'Amy'),
      creditorMemberId: splittingMemberId(world, 'Alice'),
      currencyCode: 'JPY',
      amount: { numerator: '600', denominator: '1', minorUnit: 0 },
    },
  ];
  assertExactArrangementSet(directExpenseArrangements(after), expected);
  const first = await readAccessSettlement(world);
  expect(first.accountingRevision).toBe(String(before.trips[0]!.accounting_revision));
  assertExactArrangementSet(first.arrangements, expected);
  const second = await readAccessSettlement(world);
  expect(second).toEqual(first);
  expect(
    await snapshotSplittingSources(world),
    'Read verification must preserve rejected-command sources',
  ).toEqual(before);
}
