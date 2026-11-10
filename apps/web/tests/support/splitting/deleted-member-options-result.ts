import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  memberDeletionKey,
  assertSingleMemberDeletion,
  type BrowserMemberDeletion,
} from './delete-member.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { openExpenseMemberOptions } from './expense-member-options.js';
import {
  openIndependentRepaymentMembers,
  independentRepaymentMembersKey,
  type IndependentRepaymentMembers,
} from './open-independent-repayment-members.js';

export const deletedMemberOptionsPhrase = '同行者名單及新紀錄選項不含 {string}';

/** Stable member IDs are the actual values submitted by the expense controls. */
export async function readExpenseMemberChoiceIds(
  page: Page,
): Promise<{ payer: string[]; shares: string[] }> {
  return {
    payer: await page
      .getByRole('radio')
      .evaluateAll((controls) => controls.map((control) => (control as HTMLInputElement).value)),
    shares: await page
      .getByRole('checkbox')
      .evaluateAll((controls) => controls.map((control) => (control as HTMLInputElement).value)),
  };
}

export function assertDeletedMemberChoices(
  choices: readonly string[],
  deletedId: string,
  activeIds: readonly string[],
): void {
  expect(choices, 'Picker must exclude the deleted stable member ID').not.toContain(deletedId);
  expect(new Set(choices).size, 'Picker member IDs must be unique').toBe(choices.length);
  expect([...choices].sort(), 'Picker must retain every active surviving member').toEqual(
    [...activeIds].sort(),
  );
}

export async function assertDeletedMemberOptions(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const state = world.get<BrowserMemberDeletion>(memberDeletionKey);
  expect(state).toMatchObject({ name, status: 204, reply: '' });
  assertSingleMemberDeletion(state);
  const after = await readBrowserSplittingSnapshot(world);
  expect(after).toEqual(state.after);
  expect(after.sources.members).toEqual(
    state.before.sources.members.filter((row) => row.id !== state.memberId),
  );
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[table], `${table} must be unchanged by removing an unused member`).toEqual(
      state.before.sources[table],
    );
  expect(after.expenses).toEqual(state.before.expenses);
  expect(after.repayments).toEqual(state.before.repayments);
  expect(after.totals).toEqual(state.before.totals);
  expect(after.settlement.balances).toEqual(
    state.before.settlement.balances.filter((row) => row.memberId !== state.memberId),
  );
  expect(after.settlement.simplifyDebts).toBe(state.before.settlement.simplifyDebts);
  const stableTrip = (row: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => !['updated_at', 'accounting_revision'].includes(key)),
    );
  expect(after.sources.trips.map(stableTrip)).toEqual(state.before.sources.trips.map(stableTrip));
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(state.before.settlement.accountingRevision) + 1n).toString(),
  );
  const detail = await callApi(
    world,
    'GET',
    `/api/trips/${state.tripId}/members/${state.memberId}`,
  );
  expect(detail.status(), 'Deleted member detail must be absent').toBe(404);
  const list = await callApi(world, 'GET', `/api/trips/${state.tripId}/members`);
  expect(list.status()).toBe(200);
  const { items } = (await list.json()) as { items: { id: string; isActive: boolean }[] };
  expect(items.map((row) => row.id).sort()).toEqual(
    after.sources.members.map((row) => row.id).sort(),
  );
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `刪除 ${name}`, exact: true })).toHaveCount(0);
  const activeIds = items.filter((row) => row.isActive).map((row) => row.id);
  const writes: string[] = [];
  const observe = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
    )
      writes.push(request.method());
  };
  page.on('request', observe);
  try {
    await openExpenseMemberOptions(page, world);
    const choices = await readExpenseMemberChoiceIds(page);
    assertDeletedMemberChoices(choices.payer, state.memberId, activeIds);
    assertDeletedMemberChoices(choices.shares, state.memberId, activeIds);
    await expect(page.getByRole('radio', { name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name, exact: true })).toHaveCount(0);
    await openIndependentRepaymentMembers(page, world);
    const repayment = world.get<IndependentRepaymentMembers>(independentRepaymentMembersKey);
    for (const role of ['payer', 'payee'] as const) {
      // The native select may have an empty placeholder; it is not a member choice.
      const options = repayment.choices[role].filter((choice) => choice.id !== '');
      assertDeletedMemberChoices(
        options.map((choice) => choice.id),
        state.memberId,
        activeIds,
      );
      expect(options.some((choice) => choice.name === name)).toBe(false);
    }
    expect(writes, 'Then may inspect forms but must never submit a command').toEqual([]);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(after);
  } finally {
    page.off('request', observe);
  }
}
