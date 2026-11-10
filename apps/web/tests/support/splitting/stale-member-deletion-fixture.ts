import { randomUUID } from 'node:crypto';
import { expect, request, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { seedSession } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import { assertMemberUnreferenced } from './unreferenced-carol-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const staleMemberDeletionPhrase = '未引用的 Amy 刪除確認已開啟但另一裝置剛引用 Amy';

export const staleMemberDeletionStateKey = 'splitting:browserStaleMemberDeletion';

export interface StaleMemberDeletionState {
  tripId: string;
  memberId: string;
  expenseId: string;
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
  dialogText: string;
  pageUrl: string;
  pageWrites: { method: string; url: string }[];
}

/** Keep the original browser confirmation open while another owner session commits a real expense. */
export async function seedBrowserStaleMemberDeletion(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  await seedBrowserMemberDirectory(page, world);
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, 'Amy');
  const ownerMemberId = splittingMemberId(world, 'Alice');
  const before = await readBrowserSplittingSnapshot(world);
  assertMemberUnreferenced(before.sources, memberId);

  const pageWrites: StaleMemberDeletionState['pageWrites'] = [];
  page.on('request', (event) => {
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(event.method()) &&
      new URL(event.url()).pathname.startsWith(`/api/trips/${tripId}`)
    )
      pageWrites.push({ method: event.method(), url: event.url() });
  });
  await page.getByRole('button', { name: '刪除 Amy', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Amy' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '刪除', exact: true })).toBeEnabled();
  const dialogText = await dialog.innerText();
  const pageUrl = page.url();
  expect(
    await snapshotSplittingSources(world),
    'Opening confirmation must not write sources',
  ).toEqual(before.sources);
  expect(pageWrites).toEqual([]);

  const owner = world.users.get('甲')!;
  const secondSession = await seedSession(world, '甲');
  expect(secondSession.id).toBe(owner.id);
  expect(secondSession.cookie).not.toBe(owner.cookie);
  const otherDevice = await request.newContext({
    baseURL: world.origin,
    extraHTTPHeaders: { Cookie: secondSession.cookie, Origin: world.get<string>('webOrigin') },
  });
  const expenseId = randomUUID();
  try {
    const response = await otherDevice.post(`/api/trips/${tripId}/expenses`, {
      data: {
        id: expenseId,
        item: '點心',
        amount: '100',
        currencyCode: 'JPY',
        spentOn: '2027-03-11',
        categoryId: null,
        payerMemberId: ownerMemberId,
        shareMemberIds: [memberId],
      },
    });
    expect(
      response.status(),
      'The other owner device must really commit the referencing expense',
    ).toBe(201);
    const body = (await response.json()) as {
      id: string;
      payerMemberId: string;
      shares: { memberId: string }[];
    };
    expect(body.id).toBe(expenseId);
    expect(body.payerMemberId).toBe(ownerMemberId);
    expect(body.shares.map((share) => share.memberId)).toEqual([memberId]);
  } finally {
    await otherDevice.dispose();
  }
  const after = await readBrowserSplittingSnapshot(world);
  expect(after.sources.members).toEqual(before.sources.members);
  expect(after.sources.expenses).toHaveLength(1);
  expect(after.sources.expenses[0]).toMatchObject({
    id: expenseId,
    trip_id: tripId,
    payer_member_id: ownerMemberId,
    currency_code: 'JPY',
    minor_unit: 0,
  });
  expect(String(after.sources.expenses[0]!.amount_minor)).toBe('100');
  expect(after.sources.shares).toHaveLength(1);
  expect(after.sources.shares[0]).toMatchObject({ expense_id: expenseId, member_id: memberId });
  expect(after.expenses.items[0]!.shares).toEqual([
    { memberId, amount: { numerator: '100', denominator: '1', minorUnit: 0 } },
  ]);
  for (const table of ['repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[table]).toEqual(before.sources[table]);
  expect(BigInt(after.settlement.accountingRevision)).toBe(
    BigInt(before.settlement.accountingRevision) + 1n,
  );
  expect(
    after.settlement.balances.find((row) => row.memberId === memberId && row.currencyCode === 'JPY')
      ?.netAmount,
  ).toEqual({ numerator: '-100', denominator: '1', minorUnit: 0 });
  await expect(dialog).toBeVisible();
  expect(await dialog.innerText(), 'The original confirmation remains stale and open').toBe(
    dialogText,
  );
  expect(page.url()).toBe(pageUrl);
  expect(
    pageWrites,
    'Only the independent context writes; the page has not confirmed deletion',
  ).toEqual([]);
  world.splitting.ids.expenses.set('點心', expenseId);
  world.set(staleMemberDeletionStateKey, {
    tripId,
    memberId,
    expenseId,
    before,
    after,
    dialogText,
    pageUrl,
    pageWrites,
  } satisfies StaleMemberDeletionState);
  world.set('splitting:memberId', memberId);
  world.set('splitting:sourceSnapshot', after.sources);
  world.splitting.snapshot = after.sources;
}
