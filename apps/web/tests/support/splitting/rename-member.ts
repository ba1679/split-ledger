import { expect, type Locator, type Page, type Request, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const renameMemberPhrase = 'owner 將同行者 {string} 改名為 {string}';

export const memberRenameKey = 'splitting:browserMemberRename';

export interface MemberRename {
  tripId: string;
  memberId: string;
  oldName: string;
  newName: string;
  before: BrowserSplittingSnapshot;
  writes: { method: string; path: string; body: unknown }[];
  status: number | null;
  response: unknown;
}

/** Renaming changes only the name; the form must not allocate a replacement identity. */
export function assertMemberRenamePayload(payload: unknown, newName: string): void {
  expect(payload).toEqual({ name: expect.any(String) });
  expect((payload as { name: string }).name.trim()).toBe(newName.trim());
}

/** Wait for a real PATCH result or a field-associated local name-conflict error. */
export async function observeSingleMemberRename(
  page: Page,
  path: string,
  form: Locator,
  input: Locator,
  writes: MemberRename['writes'],
): Promise<Response | null> {
  const replies: Response[] = [];
  const captureResponse = (reply: Response) => {
    if (reply.request().method() === 'PATCH' && new URL(reply.url()).pathname === path)
      replies.push(reply);
  };
  page.on('response', captureResponse);
  try {
    await form.getByRole('button', { name: '儲存名稱', exact: true }).click();
    await expect
      .poll(
        async () => {
          expect(writes.length, 'A rename must never submit twice').toBeLessThanOrEqual(1);
          if (replies.length) return true;
          if (writes.length || (await input.getAttribute('aria-invalid')) !== 'true') return false;
          const error = await input.evaluate((element) =>
            [element.getAttribute('aria-describedby'), element.getAttribute('aria-errormessage')]
              .filter(Boolean)
              .join(' ')
              .split(/\s+/)
              .filter(Boolean)
              .map((id) => document.getElementById(id))
              .filter((node) => node && node.getClientRects().length > 0)
              .map((node) => node!.textContent ?? '')
              .join(' '),
          );

          return /(?:名稱|名字).*(?:已使用|已被使用|已存在|重複)|(?:已使用|已存在|重複).*(?:名稱|名字)/.test(
            error,
          );
        },
        {
          timeout: 5000,
          message: 'Rename must return a PATCH result or accessible local conflict',
        },
      )
      .toBe(true);

    return replies[0] ?? null;
  } finally {
    page.off('response', captureResponse);
  }
}

/** Resolve the member UUID before opening its unique rename control, preserving raw input. */
export async function renameBrowserMember(
  page: Page,
  world: LedgerWorld,
  oldName: string,
  newName: string,
): Promise<void> {
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, oldName);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.find((row) => row.id === memberId)).toMatchObject({
    name: oldName,
    role: 'companion',
  });
  const path = `/api/trips/${tripId}/members/${memberId}`;
  const writes: MemberRename['writes'] = [];
  const capture = (request: Request) => {
    const requestPath = new URL(request.url()).pathname;
    if (
      ['POST', 'PATCH', 'DELETE'].includes(request.method()) &&
      requestPath.startsWith(`/api/trips/${tripId}/members`)
    )
      writes.push({ method: request.method(), path: requestPath, body: request.postDataJSON() });
  };
  page.on('request', capture);
  try {
    const rename = page.getByRole('button', { name: `改名 ${oldName}`, exact: true });
    await expect(rename, 'The uniquely named member must have one rename control').toHaveCount(1);
    await rename.click();
    const form = page.locator('form').filter({
      has: page.getByRole('button', { name: '儲存名稱', exact: true }),
    });
    await expect(form).toHaveCount(1);
    const input = form.getByRole('textbox', { name: '同行者名稱', exact: true });
    await expect(input).toHaveValue(oldName);
    await input.fill(newName);
    await expect(input).toHaveValue(newName);
    expect(writes, 'Opening and filling a rename must not mutate members').toEqual([]);
    const reply = await observeSingleMemberRename(page, path, form, input, writes);
    let response: unknown = null;
    if (reply) {
      expect(await reply.finished(), 'The member rename PATCH must finish').toBeNull();
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatchObject({ method: 'PATCH', path });
      assertMemberRenamePayload(writes[0]!.body, newName);
      response = await reply.json();
    } else {
      expect(writes, 'Local validation must not send a member mutation').toEqual([]);
      await expect(input).toHaveValue(newName);
    }
    world.set(memberRenameKey, {
      tripId,
      memberId,
      oldName,
      newName,
      before,
      writes,
      status: reply?.status() ?? null,
      response,
    } satisfies MemberRename);
    world.set('splitting:memberId', memberId);
    world.set('splitting:memberName', newName.trim());
    world.set('splitting:reply', response);
    if (!reply) return;
    expect([200, 409], 'Rename must save or return the name conflict contract').toContain(
      reply.status(),
    );
    if (reply.status() === 200)
      expect(response).toMatchObject({ id: memberId, tripId, name: newName.trim() });
    else expect(response).toMatchObject({ code: 'MEMBER_NAME_CONFLICT' });
  } finally {
    page.off('request', capture);
  }
}
