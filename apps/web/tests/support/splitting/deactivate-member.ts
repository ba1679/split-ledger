import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const deactivateMemberPhrase = 'owner 停用同行者 {string}';

export const memberStatusChangeKey = 'splitting:browserMemberStatusChange';

export interface MemberStatusChange {
  tripId: string;
  memberId: string;
  name: string;
  isActive: boolean;
  before: BrowserSplittingSnapshot;
  writes: { method: string; path: string; body: unknown }[];
  status: number;
  response: unknown;
}

/** A status action must not rename a member or replace its stable identity. */
export function assertMemberStatusPayload(payload: unknown, isActive: boolean): void {
  expect(payload).toEqual({ isActive });
}

/** Open the chosen companion confirmation, then submit exactly once through the real UI. */
export async function deactivateBrowserMember(
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
    is_active: true,
  });
  const path = `/api/trips/${tripId}/members/${memberId}`;
  const writes: MemberStatusChange['writes'] = [];
  const capture = (request: import('@playwright/test').Request) => {
    const requestPath = new URL(request.url()).pathname;
    if (request.method() === 'PATCH' && requestPath.startsWith(`/api/trips/${tripId}/members/`))
      writes.push({ method: request.method(), path: requestPath, body: request.postDataJSON() });
  };
  page.on('request', capture);
  try {
    await page.getByRole('button', { name: `停用 ${name}`, exact: true }).click();
    const dialog = page.getByRole('dialog').filter({ hasText: name });
    await expect(dialog).toBeVisible();
    expect(writes, 'Opening the confirmation must not deactivate the companion').toEqual([]);
    const confirmation = dialog.getByRole('button', { name: '停用', exact: true });
    await expect(confirmation).toBeEnabled();
    const [reply] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' && new URL(response.url()).pathname === path,
      ),
      confirmation.click(),
    ]);
    expect(
      await reply.finished(),
      'The status PATCH must finish before the next assertion',
    ).toBeNull();
    expect(writes).toHaveLength(1);
    expect(writes[0]!.path, 'The request must retain the Given member UUID').toBe(path);
    assertMemberStatusPayload(writes[0]!.body, false);
    const response = await reply.json();
    world.set(memberStatusChangeKey, {
      tripId,
      memberId,
      name,
      isActive: false,
      before,
      writes,
      status: reply.status(),
      response,
    } satisfies MemberStatusChange);
    world.set('splitting:memberId', memberId);
    world.set('splitting:memberName', name);
    world.set('splitting:memberIsActive', false);
    world.set('splitting:reply', response);
    expect(reply.status(), 'Product must complete the requested member deactivation').toBe(200);
    expect(response).toMatchObject({ id: memberId, tripId, name, isActive: false });
  } finally {
    page.off('request', capture);
  }
}
