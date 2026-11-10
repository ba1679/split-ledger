import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const renamedMemberResultPhrase = '改名後 {string} 仍沿用原成員身分';

export function assertRenameSourceIntegrity(
  before: SourceSnapshot,
  after: SourceSnapshot,
  memberId: string,
  name: string,
): void {
  const original = before.members.find((row) => row.id === memberId);
  expect(original, 'Original companion identity must exist').toBeDefined();
  expect(original!.role).toBe('companion');
  expect(after.members).toEqual(
    before.members.map((row) =>
      row.id === memberId
        ? expect.objectContaining({
            ...row,
            name,
            name_key: name.replace(/[A-Z]/g, (letter) => letter.toLowerCase()),
            updated_at: expect.anything(),
          })
        : row,
    ),
  );
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Rename must retain every ${key} row and member reference`).toEqual(
      before[key],
    );
}

interface RenamedMemberBalance {
  memberId: string;
  currencyCode: string;
  netAmount: ExactAmount;
}

export function assertRenameBalances(
  before: SourceSnapshot,
  balances: readonly RenamedMemberBalance[],
): void {
  expect(Array.isArray(balances)).toBe(true);
  const currencies = new Set(
    [...before.expenses, ...before.repayments, ...before.adjustments].map((row) =>
      String(row.currency_code),
    ),
  );
  const keys = new Set<string>();
  for (const balance of balances) {
    expect(
      before.members.some((member) => member.id === balance.memberId),
      'Balance member must belong to this trip',
    ).toBe(true);
    expect(
      currencies.has(balance.currencyCode),
      'Balance currency must belong to the accounting sources',
    ).toBe(true);
    const key = `${balance.memberId}:${balance.currencyCode}`;
    expect(keys.has(key), 'Balance member/currency pairs must be unique').toBe(false);
    keys.add(key);
    expect(
      independentSplittingOracle.equal(
        balance.netAmount,
        independentSplittingOracle.balance(before, balance.memberId, balance.currencyCode),
      ),
    ).toBe(true);
  }
  for (const currency of currencies)
    for (const member of before.members) {
      const expected = independentSplittingOracle.balance(before, String(member.id), currency);
      if (BigInt(expected.numerator) !== 0n)
        expect(
          keys.has(`${String(member.id)}:${currency}`),
          'Every nonzero oracle balance must appear',
        ).toBe(true);
    }
}

export async function assertRenamedMember(world: LedgerWorld, name: string): Promise<void> {
  expect(world.response!.status(), 'Member rename must return the updated member').toBe(200);
  const memberId = world.get<string>('splitting:memberId');
  const tripId = splittingTripId(world);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertRenameSourceIntegrity(before, after, memberId, name);
  const original = before.members.find((row) => row.id === memberId)!;
  const expectedMember = {
    id: memberId,
    tripId,
    role: original.role,
    name,
    isActive: original.is_active,
  };
  expect(world.get('splitting:reply')).toMatchObject(expectedMember);
  for (let read = 0; read < 2; read++) {
    const member = await callApi(world, 'GET', `/api/trips/${tripId}/members/${memberId}`);
    expect(member.status()).toBe(200);
    expect(await member.json()).toMatchObject(expectedMember);
    const members = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
    expect(members.status()).toBe(200);
    const current = (await members.json()).items as { id: string; name: string }[];
    expect(current.find((row) => row.id === memberId)).toMatchObject(expectedMember);
    for (const expense of before.expenses) {
      const response = await callApi(
        world,
        'GET',
        `/api/trips/${tripId}/expenses/${String(expense.id)}`,
      );
      expect(response.status()).toBe(200);
      const view = (await response.json()) as {
        payerMemberId: string;
        shares: { memberId: string; amount: ExactAmount }[];
      };
      expect(view.payerMemberId).toBe(expense.payer_member_id);
      const expectedShares = before.shares.filter((row) => row.expense_id === expense.id);
      expect(view.shares.map((row) => row.memberId).sort()).toEqual(
        expectedShares.map((row) => String(row.member_id)).sort(),
      );
      for (const share of view.shares) {
        expect(
          independentSplittingOracle.equal(
            share.amount,
            independentSplittingOracle.share(before, String(expense.id), share.memberId),
          ),
        ).toBe(true);
        if (share.memberId === memberId)
          expect(current.find((row) => row.id === share.memberId)!.name).toBe(name);
      }
      if (view.payerMemberId === memberId)
        expect(current.find((row) => row.id === view.payerMemberId)!.name).toBe(name);
    }
    const settlement = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
    expect(settlement.status()).toBe(200);
    const balances = (await settlement.json()).balances as {
      memberId: string;
      currencyCode: string;
      netAmount: ExactAmount;
    }[];
    assertRenameBalances(before, balances);
  }
  expect(
    await snapshotSplittingSources(world),
    'Verification reads must not alter sources',
  ).toEqual(after);
}
