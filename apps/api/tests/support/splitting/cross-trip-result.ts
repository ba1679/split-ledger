import { sourceTimestamp as iso, sourceDateOnly as date } from './source-temporal.js';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { crossTripFixtureKey, type CrossTripSplittingFixture } from './cross-trip-fixture.js';
import { crossTripOperations } from './cross-trip-operation.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import type { SourceSnapshot } from './types.js';
import { assertOpaqueNotFound } from './unauthorized-rejection.js';

export const crossTripResultPhrase = '跨旅行子資源存取被拒絕且來源不變';

export function assertCrossTripError(
  body: unknown,
  missing: unknown,
  source: SourceSnapshot,
): void {
  assertOpaqueNotFound(body, missing);
  const serialized = JSON.stringify(body);
  for (const rows of Object.values(source))
    for (const row of rows)
      for (const [key, value] of Object.entries(row))
        if (
          typeof value === 'string' &&
          (key === 'id' || key.endsWith('_id') || key === 'name' || key === 'item')
        )
          expect(
            serialized,
            'Cross-trip errors must not disclose the other trip source',
          ).not.toContain(value);
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      expect(key, 'A 404 must not contain accounting payloads').not.toMatch(
        /member|balance|arrangement|expense|repayment|settlement|adjustment|amount|share|revision|tripId/i,
      );
      visit(child);
    }
  };
  visit(body);
}

function money(row: Record<string, unknown>): string {
  const unit = Number(row.minor_unit);
  const digits = String(row.amount_minor).padStart(unit + 1, '0');

  return unit ? `${digits.slice(0, -unit)}.${digits.slice(-unit)}` : digits;
}

function repayment(row: Record<string, unknown>, tripId: string) {
  return {
    id: row.id,
    tripId,
    payerMemberId: row.payer_member_id,
    payeeMemberId: row.payee_member_id,
    amount: money(row),
    currencyCode: row.currency_code,
    minorUnit: row.minor_unit,
    paidOn: date(row.paid_on),
    kind: row.kind,
    settlementId: row.settlement_id,
    createdAt: iso(row.created_at),
  };
}

function exact(row: Record<string, unknown>) {
  return {
    numerator: String(row.numerator),
    denominator: String(row.denominator),
    minorUnit: row.minor_unit,
  };
}

async function assertCorrectTripChildren(
  world: LedgerWorld,
  tripId: string,
  source: SourceSnapshot,
): Promise<void> {
  const owner = world.users.get('甲')!;
  const read = async (resource: string, id: unknown) => {
    const response = await world.api.get(`/api/trips/${tripId}/${resource}/${String(id)}`, {
      headers: { Cookie: owner.cookie },
    });
    expect(
      response.status(),
      `Correct trip owner GET ${resource} must preserve the original resource`,
    ).toBe(200);

    return response.json() as Promise<Record<string, unknown>>;
  };
  for (const row of source.members)
    expect(await read('members', row.id)).toEqual({
      id: row.id,
      tripId,
      role: row.role,
      name: row.name,
      isActive: row.is_active,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    });
  for (const row of source.expenses) {
    const body = await read('expenses', row.id);
    expect(body).toMatchObject({
      id: row.id,
      tripId,
      item: row.item,
      amount: money(row),
      currencyCode: row.currency_code,
      minorUnit: row.minor_unit,
      payerMemberId: row.payer_member_id,
      spentOn: date(row.spent_on),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    });
    expect(body.category).toBeNull();
    expect(body.shares).toEqual(
      source.shares
        .filter((share) => share.expense_id === row.id)
        .map((share) => ({
          memberId: share.member_id,
          amount: independentSplittingOracle.share(source, String(row.id), String(share.member_id)),
        }))
        .sort((a, b) => String(a.memberId).localeCompare(String(b.memberId))),
    );
  }
  for (const row of source.repayments)
    expect(await read('repayments', row.id)).toEqual(repayment(row, tripId));
  for (const row of source.settlements) {
    const body = await read('settlements', row.id);
    expect(body).toMatchObject({
      id: row.id,
      tripId,
      arrangementKey: row.arrangement_key,
      sourceRevision: String(row.source_revision),
      simplifyDebts: row.simplify_debts,
      debtorMemberId: row.debtor_member_id,
      creditorMemberId: row.creditor_member_id,
      currencyCode: row.currency_code,
      obligation: {
        numerator: String(row.obligation_numerator),
        denominator: String(row.obligation_denominator),
        minorUnit: row.obligation_minor_unit,
      },
      createdAt: iso(row.created_at),
      repayment: repayment(
        source.repayments.find((payment) => payment.settlement_id === row.id)!,
        tripId,
      ),
    });
    const adjustments = source.adjustments
      .filter((adjustment) => adjustment.settlement_id === row.id)
      .map((adjustment) => ({
        memberId: adjustment.member_id,
        currencyCode: adjustment.currency_code,
        amount: exact(adjustment),
      }));
    expect(body.adjustments).toHaveLength(adjustments.length);
    expect(body.adjustments).toEqual(expect.arrayContaining(adjustments));
  }
}

export async function assertCrossTripResult(world: LedgerWorld): Promise<void> {
  const fixture = world.get<CrossTripSplittingFixture>(crossTripFixtureKey);
  const operation = world.get<keyof typeof crossTripOperations>('splitting:crossTripOperation');
  const command = crossTripOperations[operation];
  expect(world.response, 'The unique cross-trip command must retain its reply').toBeDefined();
  expect(world.response!.status()).toBe(404);
  const owner = world.users.get('甲')!;
  const missing = await world.api.get(
    `/api/trips/${fixture.currentTripId}/${command.resource}/${randomUUID()}`,
    { headers: { Cookie: owner.cookie } },
  );
  expect(missing.status()).toBe(404);
  assertCrossTripError(await world.response!.json(), await missing.json(), fixture.otherBefore);
  for (const identity of world.users.values())
    for (const secret of [identity.email, identity.cookie])
      expect(JSON.stringify(await world.response!.json())).not.toContain(secret);
  expect(await snapshotSplittingSources(world, fixture.currentTripId)).toEqual(
    fixture.currentBefore,
  );
  expect(await snapshotSplittingSources(fixture.otherWorld, fixture.otherTripId)).toEqual(
    fixture.otherBefore,
  );
  await assertCorrectTripChildren(world, fixture.currentTripId, fixture.currentBefore);
  await assertCorrectTripChildren(fixture.otherWorld, fixture.otherTripId, fixture.otherBefore);
  expect(await snapshotSplittingSources(world, fixture.currentTripId)).toEqual(
    fixture.currentBefore,
  );
  expect(await snapshotSplittingSources(fixture.otherWorld, fixture.otherTripId)).toEqual(
    fixture.otherBefore,
  );
}
