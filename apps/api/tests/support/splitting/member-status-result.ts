import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { memberStatusInput } from './member-status-command.js';
import type { SourceSnapshot } from './types.js';

export const memberStatusResultPhrase = '同行者 {string} 的狀態為 {string}';

export function assertOnlyMemberStatusChanged(
  before: SourceSnapshot,
  after: SourceSnapshot,
  memberId: string,
  isActive: boolean,
): void {
  const original = before.members.find((row) => row.id === memberId);
  const current = after.members.find((row) => row.id === memberId);
  expect(original?.role).toBe('companion');
  expect(current).toBeDefined();
  expect(current).toEqual({ ...original, is_active: isActive, updated_at: current!.updated_at });
  expect(after.members.filter((row) => row.id !== memberId)).toEqual(
    before.members.filter((row) => row.id !== memberId),
  );
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Status changes must preserve historical ${key}`).toEqual(before[key]);
  expect(after.trips).toHaveLength(before.trips.length);
  for (const trip of before.trips) {
    const updated = after.trips.find((row) => row.id === trip.id);
    expect(updated).toBeDefined();
    expect(BigInt(String(updated!.accounting_revision))).toBe(
      BigInt(String(trip.accounting_revision)) + 1n,
    );
    expect(updated).toEqual({
      ...trip,
      accounting_revision: updated!.accounting_revision,
      updated_at: updated!.updated_at,
    });
  }
}

interface StatusBalance {
  memberId: string;
  currencyCode: string;
  netAmount: ExactAmount;
}

export function assertStatusBalances(
  before: SourceSnapshot,
  after: SourceSnapshot,
  balances: readonly StatusBalance[],
): void {
  const currencies = new Set(
    [...before.expenses, ...before.repayments, ...before.adjustments].map((row) =>
      String(row.currency_code),
    ),
  );
  const memberIds = new Set(before.members.map((row) => String(row.id)));
  const seen = new Set<string>();
  for (const balance of balances) {
    expect(memberIds.has(balance.memberId), 'Only members of this trip may appear').toBe(true);
    expect(currencies.has(balance.currencyCode), 'Only source currencies may appear').toBe(true);
    const key = JSON.stringify([balance.memberId, balance.currencyCode]);
    expect(seen.has(key), 'Each member/currency balance must be unique').toBe(false);
    seen.add(key);
    expect(
      independentSplittingOracle.equal(
        balance.netAmount,
        independentSplittingOracle.balance(before, balance.memberId, balance.currencyCode),
      ),
    ).toBe(true);
  }
  for (const id of memberIds)
    for (const currency of currencies) {
      const expectedNet = independentSplittingOracle.balance(before, id, currency);
      expect(
        independentSplittingOracle.equal(
          expectedNet,
          independentSplittingOracle.balance(after, id, currency),
        ),
      ).toBe(true);
      if (BigInt(expectedNet.numerator) !== 0n)
        expect(
          seen.has(JSON.stringify([id, currency])),
          'Every nonzero historical balance, including inactive debt, must remain visible',
        ).toBe(true);
    }
}

export async function assertCompanionStatus(
  world: LedgerWorld,
  input: { name: string; status: string },
): Promise<void> {
  const isActive = memberStatusInput(input.status);
  const memberId = splittingMemberId(world, input.name);
  const tripId = splittingTripId(world);
  expect(world.get('splitting:memberId')).toBe(memberId);
  expect(world.response!.status(), 'Companion status PATCH must succeed').toBe(200);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertOnlyMemberStatusChanged(before, after, memberId, isActive);
  const member = after.members.find((row) => row.id === memberId)!;
  const expected = {
    id: memberId,
    tripId,
    role: member.role,
    name: member.name,
    isActive,
  };
  expect(world.get('splitting:reply')).toMatchObject(expected);
  for (let read = 0; read < 2; read++) {
    const single = await callApi(world, 'GET', `/api/trips/${tripId}/members/${memberId}`);
    expect(single.status()).toBe(200);
    expect(await single.json()).toMatchObject(expected);
    const list = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
    expect(list.status()).toBe(200);
    const items = ((await list.json()) as { items: { id: string }[] }).items;
    expect(items.find((row) => row.id === memberId)).toMatchObject(expected);
    expect(items.map((row) => row.id).sort()).toEqual(after.members.map((row) => row.id).sort());
    const settlement = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
    expect(settlement.status()).toBe(200);
    const view = (await settlement.json()) as {
      accountingRevision: string;
      balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
    };
    expect(view.accountingRevision).toBe(String(after.trips[0]!.accounting_revision));
    assertStatusBalances(before, after, view.balances);
  }
  expect(await snapshotSplittingSources(world), 'Confirmation reads preserve sources').toEqual(
    after,
  );
}
