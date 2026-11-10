import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { memberCreateKey, type MemberCreate } from './create-member.js';
import { memberRenameKey, type MemberRename } from './rename-member.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const memberNameConflictPhrase = '同行者欄位提示名稱已使用且既有成員與帳務不變';

/** The error belongs to the retained field and must be announced through its accessible description. */
export async function assertAccessibleMemberNameConflict(
  page: Page,
  rawName: string,
  action: 'create' | 'rename' = 'create',
): Promise<void> {
  const form = page.locator('form').filter({
    has: page.getByRole('button', {
      name: action === 'create' ? '新增同行者' : '儲存名稱',
      exact: true,
    }),
  });
  await expect(form).toHaveCount(1);
  const input = form.getByRole('textbox', { name: '同行者名稱', exact: true });
  await expect(input).toHaveCount(1);
  await expect(input).toHaveValue(rawName);
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  const describedError = await input.evaluate((element) => {
    const ids = [
      element.getAttribute('aria-describedby'),
      element.getAttribute('aria-errormessage'),
    ]
      .filter(Boolean)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean);

    return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
  });
  expect(
    describedError,
    'The name field must expose an understandable duplicate-name error',
  ).toMatch(/(?:名稱|名字).*(?:已使用|已被使用|已存在|重複)|(?:已使用|已存在|重複).*(?:名稱|名字)/);
}

/** Inspect only the submitted conflict and reread original identities and all financial projections. */
export async function assertMemberNameConflict(page: Page, world: LedgerWorld): Promise<void> {
  const create = world.state.get(memberCreateKey) as MemberCreate | undefined;
  const rename = world.state.get(memberRenameKey) as MemberRename | undefined;
  expect(
    Boolean(create) !== Boolean(rename),
    'Exactly one member action must precede this Then',
  ).toBe(true);
  const action = create ?? rename!;
  const rawName = create ? create.rawName : rename!.newName;
  const before = action.before;
  const originalResponse = world.response;
  if (create) expect(create.outcome).toBe('validation');
  if (action.writes.length) {
    expect(action.writes).toHaveLength(1);
    expect(action.status).toBe(409);
    expect(action.response).toMatchObject({ code: 'MEMBER_NAME_CONFLICT' });
  } else expect(action.status).toBeNull();
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
    await assertAccessibleMemberNameConflict(page, rawName, create ? 'create' : 'rename');
    const reply = await callApi(world, 'GET', `/api/trips/${action.tripId}/members`);
    expect(reply.status()).toBe(200);
    const body = (await reply.json()) as { items: BrowserDirectoryMember[] };
    expect(body.items).toHaveLength(before.sources.members.length);
    expect(new Set(body.items.map((member) => member.id)).size).toBe(body.items.length);
    for (const original of before.sources.members)
      expect(body.items.find((member) => member.id === original.id)).toMatchObject({
        id: original.id,
        tripId: action.tripId,
        name: original.name,
        role: original.role,
        isActive: original.is_active,
      });
    expect(
      await readBrowserSplittingSnapshot(world),
      'A rejected duplicate name must not create, rename or change accounting history/revision',
    ).toEqual(before);
    expect(writes, 'This Then must never submit or retry a member operation').toEqual([]);
  } finally {
    world.response = originalResponse;
    page.off('request', capture);
  }
}
