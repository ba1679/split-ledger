import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { readAccessSettlement } from './access-fixture.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { assertRejectedSplittingOperation } from './rejection.js';

export function assertOpaqueNotFound(body: unknown, missingBody: unknown): void {
  const allowed = ['code', 'message', 'field', 'requestId'];
  for (const candidate of [body, missingBody]) {
    expect(candidate).toMatchObject({ code: 'NOT_FOUND', message: expect.any(String) });
    expect(typeof candidate).toBe('object');
    expect(candidate).not.toBeNull();
    for (const [key, value] of Object.entries(candidate as Record<string, unknown>)) {
      expect(allowed, 'Errors must contain only public ApiError fields').toContain(key);
      expect(typeof value).toBe('string');
    }
  }
  const actual = body as Record<string, unknown>;
  const missing = missingBody as Record<string, unknown>;
  expect(Object.keys(actual).sort()).toEqual(Object.keys(missing).sort());
  expect({ code: actual.code, message: actual.message, field: actual.field }).toEqual({
    code: missing.code,
    message: missing.message,
    field: missing.field,
  });
}

export async function assertUnauthorizedSplittingRejection(world: LedgerWorld): Promise<void> {
  await assertRejectedSplittingOperation(world, 'NOT_FOUND');
  const foreign = world.get<{ id: string; cookie: string }>('splitting:accessForeign');
  // Confirmation is read-only even when the unique When issued a write command.
  const missing = await world.api.get(`/api/trips/${randomUUID()}`, {
    headers: { Cookie: foreign.cookie },
  });
  expect(missing.status()).toBe(404);
  assertOpaqueNotFound(await world.response!.json(), await missing.json());

  // The foreign fixture owns no trips: require every accounting source to remain empty,
  // rather than only checking that Alice's trip survived the refused write.
  const foreignId = world.get<{ id: string }>('splitting:accessForeign').id;
  const foreignTrips = await world.db.query('SELECT id FROM trips WHERE owner_id=$1', [foreignId]);
  expect(foreignTrips.rows).toEqual(world.get('splitting:accessForeignSources'));
  for (const table of [
    'trip_members',
    'expenses',
    'expense_shares',
    'repayments',
    'settlements',
    'settlement_adjustments',
  ]) {
    expect(
      (await world.db.query(`SELECT * FROM ${table} WHERE owner_id=$1`, [foreignId])).rows,
    ).toEqual([]);
  }

  const source = world.splitting.snapshot!;
  const tripId = splittingTripId(world);
  const owner = world.get<{ cookie: string }>('splitting:accessOwner');
  const read = async (suffix: string) => {
    const response = await world.api.get(`/api/trips/${tripId}${suffix}`, {
      headers: { Cookie: owner.cookie },
    });
    expect(response.status(), `Owner retains complete access to ${suffix}`).toBe(200);

    return response.json() as Promise<Record<string, unknown>>;
  };
  for (const row of source.expenses) {
    const expense = await read(`/expenses/${row.id}`);
    expect(expense).toMatchObject({
      id: row.id,
      tripId,
      item: row.item,
      payerMemberId: row.payer_member_id,
    });
    const shares = source.shares.filter((share) => share.expense_id === row.id);
    expect(expense.shares).toHaveLength(shares.length);
    for (const share of shares) {
      const actual = (expense.shares as { memberId: string; amount: ExactAmount }[]).find(
        (entry) => entry.memberId === share.member_id,
      );
      expect(actual).toBeDefined();
      expect(
        independentSplittingOracle.equal(
          actual!.amount,
          independentSplittingOracle.share(source, String(row.id), String(share.member_id)),
        ),
      ).toBe(true);
    }
  }
  for (const row of source.settlements) {
    const settlement = await read(`/settlements/${row.id}`);
    expect(settlement).toMatchObject({
      id: row.id,
      tripId,
      arrangementKey: row.arrangement_key,
      sourceRevision: String(row.source_revision),
      debtorMemberId: row.debtor_member_id,
      creditorMemberId: row.creditor_member_id,
    });
    expect(settlement.obligation).toEqual({
      numerator: String(row.obligation_numerator),
      denominator: String(row.obligation_denominator),
      minorUnit: row.obligation_minor_unit,
    });
    expect(settlement.repayment).toMatchObject({
      id: source.repayments.find((repayment) => repayment.settlement_id === row.id)!.id,
    });
    const adjustments = source.adjustments.filter(
      (adjustment) => adjustment.settlement_id === row.id,
    );
    expect(settlement.adjustments).toHaveLength(adjustments.length);
    expect(settlement.adjustments).toEqual(
      expect.arrayContaining(
        adjustments.map((adjustment) => ({
          memberId: adjustment.member_id,
          currencyCode: adjustment.currency_code,
          amount: {
            numerator: String(adjustment.numerator),
            denominator: String(adjustment.denominator),
            minorUnit: adjustment.minor_unit,
          },
        })),
      ),
    );
  }
  expect(await readAccessSettlement(world)).toEqual(world.get('splitting:accessView'));
  expect(await snapshotSplittingSources(world)).toEqual(source);
}
