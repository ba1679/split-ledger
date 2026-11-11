import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { memberStatusChangeKey, type MemberStatusChange } from './deactivate-member.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { referencedMemberStateKey } from './referenced-member-fixture.js';

export const deactivatedMemberHistoryPhrase = '{string} 的歷史分攤及還款仍保留';

/** Compare stable historical facts, allowing only the requested member status and trip revision. */
export function assertDeactivatedMemberHistory(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  memberId: string,
): void {
  const original = before.sources.members.find((row) => row.id === memberId);
  expect(original).toMatchObject({ id: memberId, is_active: true });
  const current = after.sources.members.find((row) => row.id === memberId);
  expect(current).toMatchObject({ id: memberId, is_active: false });
  const omitUpdatedAt = (row: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'updated_at'));
  expect(after.sources.members).toHaveLength(before.sources.members.length);
  for (const row of after.sources.members) {
    const previous = before.sources.members.find((item) => item.id === row.id);
    expect(previous).toBeDefined();
    expect(omitUpdatedAt(row)).toEqual(
      row.id === memberId
        ? { ...omitUpdatedAt(previous!), is_active: false }
        : omitUpdatedAt(previous!),
    );
  }
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[table], `${table} must survive deactivation unchanged`).toEqual(
      before.sources[table],
    );
  expect(before.sources.shares.some((row) => row.member_id === memberId)).toBe(true);
  expect(
    before.sources.repayments.some(
      (row) => row.payer_member_id === memberId || row.payee_member_id === memberId,
    ),
  ).toBe(true);
  expect(after.expenses).toEqual(before.expenses);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.totals).toEqual(before.totals);
  expect(after.settlement.balances).toEqual(before.settlement.balances);
  expect(after.settlement.simplifyDebts).toBe(before.settlement.simplifyDebts);
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(before.settlement.accountingRevision) + 1n).toString(),
  );
}

/** Members screen has no history list: verify history through the real API and DB without navigating. */
export async function assertDeactivatedMemberHistoryScreen(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const state = world.get<MemberStatusChange>(memberStatusChangeKey);
  const fixture = world.get<{ memberId: string; after: BrowserSplittingSnapshot }>(
    referencedMemberStateKey,
  );
  const memberId = splittingMemberId(world, name);
  expect(state).toMatchObject({ memberId, name, isActive: false, status: 200 });
  expect(fixture.memberId).toBe(memberId);
  expect(state.before).toEqual(fixture.after);
  const after = await readBrowserSplittingSnapshot(world);
  assertDeactivatedMemberHistory(fixture.after, after, memberId);
  const base = `/api/trips/${splittingTripId(world)}/members`;
  const detail = await callApi(world, 'GET', `${base}/${memberId}`);
  expect(detail.status(), 'Deactivation must retain the original member resource').toBe(200);
  const member = await detail.json();
  expect(member).toMatchObject({
    id: memberId,
    tripId: splittingTripId(world),
    name,
    role: 'companion',
    isActive: false,
  });
  const list = await callApi(world, 'GET', base);
  expect(list.status()).toBe(200);
  const items = ((await list.json()) as { items: { id: string }[] }).items;
  expect(items.filter((row) => row.id === memberId)).toEqual([member]);
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `重新啟用 ${name}`, exact: true })).toBeVisible();
  await expect(page.getByText('已停用', { exact: true })).toBeVisible();
  expect(
    await readBrowserSplittingSnapshot(world),
    'Then reads must preserve all historical facts',
  ).toEqual(after);
}
