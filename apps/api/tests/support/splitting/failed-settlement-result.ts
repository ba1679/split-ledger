import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';
import { assertCurrencyZeroSums, type ZeroSumBalance } from './zero-sum-result.js';
import type { AccessSettlementView } from './access-fixture.js';

export const failedSettlementPhrase = '結清失敗不留下任何部分帳務紀錄';

export function assertInternalSettlementError(body: unknown, secrets: readonly string[]): void {
  expect(body).toMatchObject({ code: 'INTERNAL_ERROR', message: expect.any(String) });
  expect(body && typeof body === 'object' && !Array.isArray(body)).toBe(true);
  for (const key of Object.keys(body as Record<string, unknown>))
    expect(
      ['code', 'message', 'field', 'requestId'],
      'Internal errors expose only public error fields',
    ).toContain(key);
  const record = body as Record<string, unknown>;
  if (record.field !== undefined) expect(record.field).toEqual(expect.any(String));
  if (record.requestId !== undefined) expect(record.requestId).toEqual(expect.any(String));
  const text = JSON.stringify(body);
  expect(text).not.toMatch(
    /Isolated settlement failure|after the first adjustment|stack|INSERT INTO|UPDATE\s+trips/i,
  );
  for (const secret of secrets.filter(Boolean)) expect(text).not.toContain(secret);
}

export function assertSettlementRolledBack(
  before: SourceSnapshot,
  after: SourceSnapshot,
  pending: PendingSettlementSnapshot,
  faultReached: boolean,
): void {
  expect(faultReached, 'Must reach the injected fault after inserting the first adjustment').toBe(
    true,
  );
  expect(after, 'Every source and the accounting revision must roll back together').toEqual(before);
  expect(after.settlements.filter((row) => row.id === pending.id)).toHaveLength(0);
  expect(
    after.repayments.filter(
      (row) => row.id === pending.repaymentId || row.settlement_id === pending.id,
    ),
  ).toHaveLength(0);
  expect(after.adjustments.filter((row) => row.settlement_id === pending.id)).toHaveLength(0);
}

/** Read-only verification of the failed command, including the original still-valid arrangement. */
export async function assertFailedSettlementResult(world: LedgerWorld): Promise<void> {
  expect(world.response, 'When must retain the actual failed response').toBeDefined();
  expect(world.response!.status()).toBe(500);
  const pending = world.get<PendingSettlementSnapshot>('splitting:faultInput');
  expect(world.get('splitting:settlementSnapshot')).toEqual(pending);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertSettlementRolledBack(before, after, pending, world.get<boolean>('splitting:faultReached'));
  const sessions = await world.db.query<{ token: string }>(
    'SELECT token FROM auth.session WHERE user_id=ANY($1::text[])',
    [[...world.users.values()].map((user) => user.id)],
  );
  assertInternalSettlementError(await world.response!.json(), [
    pending.id,
    pending.repaymentId,
    pending.arrangementKey,
    ...[...world.users.values()].flatMap((user) => [user.cookie, user.email]),
    ...sessions.rows.map((row) => row.token),
    ...Object.values(before)
      .flat()
      .flatMap((row) =>
        [row.id, row.item].filter(
          (value): value is string => typeof value === 'string' && value.length > 0,
        ),
      ),
  ]);
  const tripId = splittingTripId(world);
  const viewResponse = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
  expect(viewResponse.status()).toBe(200);
  const view = (await viewResponse.json()) as AccessSettlementView & { balances: ZeroSumBalance[] };
  expect(view.accountingRevision).toBe(pending.accountingRevision);
  expect(view.simplifyDebts).toBe(before.trips[0]!.simplify_debts);
  const original = view.arrangements.filter((row) => row.key === pending.arrangementKey);
  expect(original).toHaveLength(1);
  expect(original[0]).toMatchObject({
    debtorMemberId: pending.debtorMemberId,
    creditorMemberId: pending.creditorMemberId,
    currencyCode: pending.currencyCode,
  });
  expect(independentSplittingOracle.equal(original[0]!.amount, pending.expectedAmount)).toBe(true);
  assertCurrencyZeroSums(before, view.balances);
  for (const path of [`settlements/${pending.id}`, `repayments/${pending.repaymentId}`]) {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/${path}`);
    expect(response.status(), 'Reserved IDs must not resolve after rollback').toBe(404);
    expect(await response.json()).toMatchObject({ code: 'NOT_FOUND' });
  }
  expect(
    await snapshotSplittingSources(world),
    'Verification GETs do not alter rolled-back sources',
  ).toEqual(before);
}
