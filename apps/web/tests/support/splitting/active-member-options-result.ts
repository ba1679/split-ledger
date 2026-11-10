import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { memberCreateKey, assertMemberCreatePayload, type MemberCreate } from './create-member.js';
import { memberStatusChangeKey, type MemberStatusChange } from './deactivate-member.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';
import { openExpenseMemberOptions } from './expense-member-options.js';
import { readExpenseMemberChoiceIds } from './deleted-member-options-result.js';

export const activeMemberOptionsPhrase = '同行者名單顯示啟用中的 {string} 且可作為付款人及分攤者';

/** A returned name alone cannot establish identity or distinguish reactivation from insertion. */
export function assertActiveMemberIdentity(
  before: readonly Record<string, unknown>[],
  after: readonly Record<string, unknown>[],
  memberId: string,
  name: string,
  action: 'create' | 'reactivate',
): void {
  expect(name).toBe(name.trim());
  expect(name).not.toBe('');
  expect(new Set(after.map((row) => row.id)).size).toBe(after.length);
  const member = after.find((row) => row.id === memberId);
  expect(member).toMatchObject({ id: memberId, name, is_active: true, role: 'companion' });
  expect(after.filter((row) => row.id !== memberId)).toEqual(
    before.filter((row) => row.id !== memberId),
  );
  if (action === 'create') {
    expect(before.some((row) => row.id === memberId)).toBe(false);
    expect(after).toHaveLength(before.length + 1);
  } else {
    expect(after).toHaveLength(before.length);
    const original = before.find((row) => row.id === memberId);
    expect(original).toMatchObject({ id: memberId, name, is_active: false });
    expect(member).toEqual({ ...original, is_active: true, updated_at: member!.updated_at });
  }
}

export async function assertActiveMemberOptions(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const created = world.state.get(memberCreateKey) as MemberCreate | undefined;
  const activated = world.state.get(memberStatusChangeKey) as MemberStatusChange | undefined;
  expect(
    Boolean(created) !== Boolean(activated),
    'Exactly one preceding member Act is required',
  ).toBe(true);
  const action = created ?? activated!;
  const memberId = action.memberId;
  expect(memberId, 'The Act must retain its submitted member UUID').not.toBeNull();
  if (created) {
    expect(created).toMatchObject({ outcome: 'saved', status: 201 });
    expect(created.rawName.trim()).toBe(name);
    expect(created.writes).toHaveLength(1);
    expect(assertMemberCreatePayload(created.writes[0]!.body, created.rawName)).toBe(memberId);
    expect(created.writes[0]).toMatchObject({
      method: 'POST',
      path: `/api/trips/${action.tripId}/members`,
    });
    expect(created.response).toMatchObject({
      id: memberId,
      tripId: action.tripId,
      name,
      isActive: true,
    });
  } else {
    expect(activated).toMatchObject({ name, isActive: true, status: 200 });
    expect(activated!.writes).toEqual([
      {
        method: 'PATCH',
        path: `/api/trips/${action.tripId}/members/${memberId}`,
        body: { isActive: true },
      },
    ]);
    expect(activated!.response).toMatchObject({
      id: memberId,
      tripId: action.tripId,
      name,
      isActive: true,
    });
  }
  const after = await readBrowserSplittingSnapshot(world);
  assertActiveMemberIdentity(
    action.before.sources.members,
    after.sources.members,
    memberId!,
    name,
    created ? 'create' : 'reactivate',
  );
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[table], `Member lifecycle must preserve historical ${table}`).toEqual(
      action.before.sources[table],
    );
  expect(after.expenses).toEqual(action.before.expenses);
  expect(after.repayments).toEqual(action.before.repayments);
  expect(after.totals).toEqual(action.before.totals);
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(action.before.settlement.accountingRevision) + 1n).toString(),
  );
  const list = await callApi(world, 'GET', `/api/trips/${action.tripId}/members`);
  expect(list.status()).toBe(200);
  const { items } = (await list.json()) as { items: BrowserDirectoryMember[] };
  expect(items.map((row) => row.id).sort()).toEqual(
    after.sources.members.map((row) => row.id).sort(),
  );
  expect(items.find((row) => row.id === memberId)).toMatchObject({
    id: memberId,
    tripId: action.tripId,
    name,
    isActive: true,
    role: 'companion',
  });
  const detail = await callApi(world, 'GET', `/api/trips/${action.tripId}/members/${memberId}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({
    id: memberId,
    tripId: action.tripId,
    name,
    isActive: true,
  });
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `停用 ${name}`, exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: `重新啟用 ${name}`, exact: true })).toHaveCount(0);
  const writes: string[] = [];
  const capture = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
    )
      writes.push(request.method());
  };
  page.on('request', capture);
  try {
    await openExpenseMemberOptions(page, world);
    const choices = await readExpenseMemberChoiceIds(page);
    const activeIds = items
      .filter((row) => row.isActive)
      .map((row) => row.id)
      .sort();
    for (const ids of [choices.payer, choices.shares]) {
      expect(new Set(ids).size).toBe(ids.length);
      expect([...ids].sort()).toEqual(activeIds);
      expect(ids).toContain(memberId);
    }
    for (const role of ['radio', 'checkbox'] as const) {
      const choice = page.getByRole(role, { name, exact: true });
      await expect(choice).toBeEnabled();
      await expect(choice).toHaveAttribute('value', memberId!);
    }
    expect(writes, 'Then may inspect member options but must not fill or save an expense').toEqual(
      [],
    );
    expect(await readBrowserSplittingSnapshot(world)).toEqual(after);
  } finally {
    page.off('request', capture);
  }
}
