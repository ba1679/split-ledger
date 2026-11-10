import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import {
  memberDeletionKey,
  assertSingleMemberDeletion,
  type BrowserMemberDeletion,
} from './delete-member.js';
import {
  staleMemberDeletionStateKey,
  type StaleMemberDeletionState,
} from './stale-member-deletion-fixture.js';

export const referencedMemberDeletionPhrase = '畫面提示成員已被使用並提供停用而未刪除 Amy';

/** Inspect the rejection and available alternative without performing that alternative. */
export async function assertMemberInUseGuidance(page: Page): Promise<void> {
  const alert = page.getByRole('alert').filter({
    hasText: /(?:已被?使用|已引用|已有.*(?:帳務|支出|還款)|已有.*紀錄)/,
  });
  await expect(alert).toBeVisible();
  await expect(alert).not.toHaveText(/MEMBER_IN_USE/);
  const deactivate = page.getByRole('button', { name: '停用 Amy', exact: true });
  await expect(deactivate).toBeVisible();
  await expect(deactivate).toBeEnabled();
  expect(
    await deactivate.evaluate(
      (element) =>
        element.tabIndex >= 0 && !element.closest('[inert],[hidden],[aria-hidden="true"]'),
    ),
    'The offered deactivation must be keyboard accessible',
  ).toBe(true);
}

export async function assertReferencedMemberDeletionRejected(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const deletion = world.get<BrowserMemberDeletion>(memberDeletionKey);
  const stale = world.get<StaleMemberDeletionState>(staleMemberDeletionStateKey);
  const originalResponse = world.response;
  expect(deletion.name).toBe('Amy');
  expect(deletion.memberId).toBe(stale.memberId);
  expect(deletion.tripId).toBe(stale.tripId);
  expect(deletion.status).toBe(409);
  expect(JSON.parse(deletion.reply) as unknown).toMatchObject({ code: 'MEMBER_IN_USE' });
  assertSingleMemberDeletion(deletion);
  expect(deletion.before).toEqual(stale.after);
  expect(deletion.after, 'Rejected deletion must preserve the newly referenced state').toEqual(
    stale.after,
  );
  expect(stale.after.sources.shares).toContainEqual(
    expect.objectContaining({ expense_id: stale.expenseId, member_id: stale.memberId }),
  );
  const writes: string[] = [];
  const capture = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
    )
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on('request', capture);
  try {
    await assertMemberInUseGuidance(page);
    const member = await callApi(
      world,
      'GET',
      `/api/trips/${stale.tripId}/members/${stale.memberId}`,
    );
    expect(member.status(), 'The same Amy UUID must remain readable after rejection').toBe(200);
    expect(await member.json()).toMatchObject({
      id: stale.memberId,
      tripId: stale.tripId,
      name: 'Amy',
      role: 'companion',
      isActive: true,
    });
    expect(
      await readBrowserSplittingSnapshot(world),
      'Member identities, the new reference, accounting history and revision must remain intact',
    ).toEqual(stale.after);
    assertSingleMemberDeletion(deletion);
    expect(writes, 'This Then must not retry deletion or deactivate Amy').toEqual([]);
  } finally {
    page.off('request', capture);
    world.response = originalResponse;
  }
}
