import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { confirmOpenMemberDeletion } from './delete-member.js';
import {
  staleMemberDeletionStateKey,
  type StaleMemberDeletionState,
} from './stale-member-deletion-fixture.js';

export const confirmStaleMemberDeletionPhrase = 'owner 確認刪除同行者 {string}';

/** Confirm the original stale dialog once, without reopening it or refreshing the page. */
export async function confirmStaleMemberDeletion(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const stale = world.get<StaleMemberDeletionState>(staleMemberDeletionStateKey);
  expect(splittingMemberId(world, name)).toBe(stale.memberId);
  expect(page.url()).toBe(stale.pageUrl);
  const dialog = page.getByRole('dialog').filter({ hasText: name });
  await expect(dialog).toBeVisible();
  expect(await dialog.innerText()).toBe(stale.dialogText);
  expect(stale.pageWrites).toEqual([]);

  const result = await confirmOpenMemberDeletion(page, world, name, 409);
  expect(result.before).toEqual(stale.after);
  expect(JSON.parse(result.reply) as unknown).toMatchObject({ code: 'MEMBER_IN_USE' });
  expect(stale.pageWrites).toEqual([
    {
      method: 'DELETE',
      url: expect.stringContaining(`/api/trips/${stale.tripId}/members/${stale.memberId}`),
    },
  ]);
}
