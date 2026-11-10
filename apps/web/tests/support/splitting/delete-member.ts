import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const deleteMemberPhrase = 'owner 刪除同行者 {string}';

export const memberDeletionKey = 'splitting:browserMemberDeletion';

export interface BrowserMemberDeletion {
  tripId: string;
  memberId: string;
  name: string;
  status: number;
  reply: string;
  mutations: { method: string; path: string; payload: string | null }[];
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

export function assertSingleMemberDeletion(state: BrowserMemberDeletion): void {
  expect(state.mutations).toEqual([
    {
      method: 'DELETE',
      path: `/api/trips/${state.tripId}/members/${state.memberId}`,
      payload: null,
    },
  ]);
}

/** Also serves the stale-confirmation When: it must never reopen or refresh its dialog. */
export async function confirmOpenMemberDeletion(
  page: Page,
  world: LedgerWorld,
  name: string,
  expectedStatus: 204 | 409,
): Promise<BrowserMemberDeletion> {
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, name);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.find((row) => row.id === memberId)).toMatchObject({ name });
  const dialog = page.getByRole('dialog').filter({ hasText: name });
  await expect(dialog).toBeVisible();
  const mutations: BrowserMemberDeletion['mutations'] = [];
  const onRequest = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) &&
      path.startsWith(`/api/trips/${tripId}`)
    )
      mutations.push({ method: request.method(), path, payload: request.postData() });
  };
  page.on('request', onRequest);
  try {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname === `/api/trips/${tripId}/members/${memberId}`,
    );
    await dialog.getByRole('button', { name: '刪除', exact: true }).click();
    const response = await responsePromise;
    expect(response.status(), 'The real member DELETE must return its contracted result').toBe(
      expectedStatus,
    );
    // HTTP 204 has no message body; browsers may not retain a protocol body handle.
    const reply = response.status() === 204 ? '' : await response.text();
    if (expectedStatus === 204) {
      expect([undefined, '0']).toContain(response.headers()['content-length']);
      expect(reply).toBe('');
      await expect(dialog).toBeHidden();
      await expect(page.getByRole('button', { name: `刪除 ${name}`, exact: true })).toHaveCount(0);
    }
    const after = await readBrowserSplittingSnapshot(world);
    const state: BrowserMemberDeletion = {
      tripId,
      memberId,
      name,
      status: response.status(),
      reply,
      mutations,
      before,
      after,
    };
    assertSingleMemberDeletion(state);
    world.set(memberDeletionKey, state);
    world.set('splitting:memberId', memberId);
    world.set('splitting:memberReply', reply === '' ? null : (JSON.parse(reply) as unknown));
    world.set('splitting:before', before.sources);
    world.set('splitting:after', after.sources);

    return state;
  } finally {
    page.off('request', onRequest);
  }
}

export async function deleteBrowserMember(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const memberId = splittingMemberId(world, name);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.find((row) => row.id === memberId)).toMatchObject({
    name,
    role: 'companion',
  });
  await page.getByRole('button', { name: `刪除 ${name}`, exact: true }).click();
  await confirmOpenMemberDeletion(page, world, name, 204);
}
