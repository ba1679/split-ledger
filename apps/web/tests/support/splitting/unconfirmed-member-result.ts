import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { memberCreateKey, type MemberCreate } from './create-member.js';
import {
  memberLostResponseStateKey,
  type MemberLostResponseState,
} from './member-lost-response-fixture.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const unconfirmedMemberPhrase = '同行者畫面保留 Carol 並提示保存結果尚未確認';

/** The authority knows one creation committed; the browser still cannot verify its UUID. */
export function assertUnconfirmedMemberAuthority(
  action: MemberCreate,
  loss: MemberLostResponseState,
  current: BrowserSplittingSnapshot,
  members: BrowserDirectoryMember[],
): void {
  expect(action.outcome).toBe('unconfirmed');
  expect(action.rawName).toBe('Carol');
  expect(action.status).toBeNull();
  expect(action.response).toBeNull();
  expect(action.memberId).toBe(loss.commandId);
  expect(action.memberId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(action.tripId).toBe(loss.tripId);
  expect(action.before).toEqual(loss.before);
  expect(loss.failure).toBeUndefined();
  expect(
    loss.persisted,
    'Response loss must follow an actual committed member creation',
  ).toBeDefined();
  expect(loss.persisted!.status).toBe(201);
  expect(action.writes).toEqual([
    {
      method: 'POST',
      path: `/api/trips/${loss.tripId}/members`,
      body: { id: action.memberId, name: 'Carol' },
    },
  ]);
  expect(loss.mutations).toHaveLength(1);
  expect(loss.mutations[0]).toMatchObject({
    id: action.memberId,
    body: { id: action.memberId, name: 'Carol' },
  });
  expect(new URL(loss.mutations[0]!.url).pathname).toBe(action.writes[0]!.path);
  expect(
    loss.verificationIds.length,
    'The browser must attempt to verify the original UUID',
  ).toBeGreaterThan(0);
  expect(new Set(loss.verificationIds)).toEqual(new Set([action.memberId]));
  expect(members).toEqual(loss.persisted!.members);
  expect(members).toHaveLength(loss.membersBefore.length + 1);
  expect(new Set(members.map((member) => member.id)).size).toBe(members.length);
  expect(members.filter((member) => member.name === 'Carol')).toEqual([
    expect.objectContaining({
      id: action.memberId,
      tripId: loss.tripId,
      role: 'companion',
      isActive: true,
    }),
  ]);
  expect(members.filter((member) => member.id !== action.memberId)).toEqual(loss.membersBefore);
  expect(loss.persisted!.response).toMatchObject({ id: action.memberId, name: 'Carol' });
  expect(current).toEqual(loss.persisted!.snapshot);
  expect(current.sources.members).toHaveLength(loss.before.sources.members.length + 1);
  expect(current.sources.members.filter((member) => member.id === action.memberId)).toHaveLength(1);
  expect(current.sources.members.filter((member) => member.id !== action.memberId)).toEqual(
    loss.before.sources.members,
  );
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(current.sources[table]).toEqual(loss.before.sources[table]);
  expect(BigInt(current.settlement.accountingRevision)).toBe(
    BigInt(loss.before.settlement.accountingRevision) + 1n,
  );
}

export async function assertUnconfirmedMemberDraft(page: Page, commandId: string): Promise<void> {
  const form = page.locator('form').filter({
    has: page.getByRole('button', { name: '新增同行者', exact: true }),
  });
  await expect(form).toHaveCount(1);
  await expect(form).toHaveAttribute('data-command-id', commandId);
  await expect(form.getByRole('textbox', { name: '同行者名稱', exact: true })).toHaveValue('Carol');
  await expect(page.getByText(/保存結果尚未確認/).first()).toBeVisible();
  await expect(
    page
      .getByText(/新增成功|儲存成功|保存成功|(?:同行者|Carol).*已新增|已新增.*(?:同行者|Carol)/)
      .filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByText(/^(?:新增失敗|保存失敗|儲存失敗|同行者未保存|同行者未新增)$/)
      .filter({ visible: true }),
  ).toHaveCount(0);
}

/** Read-only Then: never restore interception, navigate, submit, or retry the creation. */
export async function assertUnconfirmedMember(page: Page, world: LedgerWorld): Promise<void> {
  const action = world.get<MemberCreate>(memberCreateKey);
  const loss = world.get<MemberLostResponseState>(memberLostResponseStateKey);
  const originalResponse = world.response;
  const originalUrl = page.url();
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
    await assertUnconfirmedMemberDraft(page, loss.commandId!);
    await expect.poll(() => loss.verificationIds.length, { timeout: 5000 }).toBeGreaterThan(0);
    const response = await callApi(world, 'GET', `/api/trips/${loss.tripId}/members`);
    expect(response.status()).toBe(200);
    const members = ((await response.json()) as { items: BrowserDirectoryMember[] }).items;
    assertUnconfirmedMemberAuthority(
      action,
      loss,
      await readBrowserSplittingSnapshot(world),
      members,
    );
    expect(world.get('splitting:browserMemberCommandId')).toBe(action.memberId);
    await assertUnconfirmedMemberDraft(page, loss.commandId!);
    expect(loss.mutations).toHaveLength(1);
    expect(writes, 'A Then must not retry any write').toEqual([]);
    expect(page.url()).toBe(originalUrl);
  } finally {
    world.response = originalResponse;
    page.off('request', capture);
  }
}
