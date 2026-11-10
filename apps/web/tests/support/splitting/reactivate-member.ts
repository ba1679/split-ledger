import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  assertMemberStatusPayload,
  memberStatusChangeKey,
  type MemberStatusChange,
} from './deactivate-member.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const reactivateMemberPhrase = 'owner 重新啟用同行者 {string}';

/** Reactivation is one real UI command against the existing inactive companion UUID. */
export async function reactivateBrowserMember(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, name);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.find((row) => row.id === memberId)).toMatchObject({
    name,
    role: 'companion',
    is_active: false,
  });
  const path = `/api/trips/${tripId}/members/${memberId}`;
  const writes: MemberStatusChange['writes'] = [];
  const capture = (request: Request) => {
    const requestPath = new URL(request.url()).pathname;
    if (request.method() === 'PATCH' && requestPath.startsWith(`/api/trips/${tripId}/members/`))
      writes.push({ method: request.method(), path: requestPath, body: request.postDataJSON() });
  };
  page.on('request', capture);
  try {
    const action = page.getByRole('button', { name: `重新啟用 ${name}`, exact: true });
    await expect(action).toBeEnabled();
    const [reply] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' && new URL(response.url()).pathname === path,
      ),
      action.click(),
    ]);
    expect(await reply.finished(), 'The reactivation PATCH must finish').toBeNull();
    expect(writes, 'Reactivation submits the existing member exactly once').toHaveLength(1);
    expect(writes[0]!.path, 'Reactivation must retain the Given member UUID').toBe(path);
    assertMemberStatusPayload(writes[0]!.body, true);
    const response: unknown = await reply.json();
    world.set(memberStatusChangeKey, {
      tripId,
      memberId,
      name,
      isActive: true,
      before,
      writes,
      status: reply.status(),
      response,
    } satisfies MemberStatusChange);
    world.set('splitting:memberId', memberId);
    world.set('splitting:memberName', name);
    world.set('splitting:memberIsActive', true);
    world.set('splitting:reply', response);
    expect(reply.status(), 'Product must reactivate the existing companion').toBe(200);
    expect(response).toMatchObject({ id: memberId, tripId, name, isActive: true });
  } finally {
    page.off('request', capture);
  }
}
