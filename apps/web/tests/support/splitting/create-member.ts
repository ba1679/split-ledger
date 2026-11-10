import { expect, type Page, type Request, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  memberLostResponseStateKey,
  type MemberLostResponseState,
} from './member-lost-response-fixture.js';

export const createMemberPhrase = 'owner 新增同行者 {string}';

export const memberCreateKey = 'splitting:browserMemberCreate';

export interface MemberCreate {
  tripId: string;
  rawName: string;
  memberId: string | null;
  before: BrowserSplittingSnapshot;
  writes: { method: string; path: string; body: unknown }[];
  status: number | null;
  response: unknown;
  outcome: 'saved' | 'validation' | 'unconfirmed';
}

export function assertMemberCreatePayload(payload: unknown, rawName: string): string {
  expect(payload).toEqual({ id: expect.any(String), name: expect.any(String) });
  const body = payload as { id: string; name: string };
  expect(body.id, 'The product must reserve a UUID before sending the creation').toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(body.name.trim()).toBe(rawName.trim());

  return body.id;
}

/** Fill the existing form with raw input and submit once, including lost-response cases. */
export async function createBrowserMember(
  page: Page,
  world: LedgerWorld,
  rawName: string,
): Promise<void> {
  const tripId = splittingTripId(world);
  const path = `/api/trips/${tripId}/members`;
  const before = await readBrowserSplittingSnapshot(world);
  const lost = world.state.get(memberLostResponseStateKey) as MemberLostResponseState | undefined;
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: '新增同行者', exact: true }) });
  await expect(form).toHaveCount(1);
  const input = form.getByRole('textbox', { name: '同行者名稱', exact: true });
  await input.fill(rawName);
  await expect(input).toHaveValue(rawName);
  const reservedId = await form.getAttribute('data-command-id');
  expect(reservedId, 'The member form must retain its preallocated command UUID').toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  const writes: MemberCreate['writes'] = [];
  const responses: Response[] = [];
  const capture = (request: Request) => {
    const requestPath = new URL(request.url()).pathname;
    if (['POST', 'PATCH', 'DELETE'].includes(request.method()) && requestPath.startsWith(path))
      writes.push({ method: request.method(), path: requestPath, body: request.postDataJSON() });
  };
  const captureResponse = (response: Response) => {
    if (response.request().method() === 'POST' && new URL(response.url()).pathname === path)
      responses.push(response);
  };
  const unknown = page.getByText(/保存結果尚未確認|尚無法確認|結果未明/).first();
  const validation = input
    .locator('xpath=ancestor::form')
    .locator('[aria-invalid="true"], [role="alert"]')
    .first();
  let outcome: MemberCreate['outcome'] | undefined;
  page.on('request', capture);
  page.on('response', captureResponse);
  try {
    await form.getByRole('button', { name: '新增同行者', exact: true }).click();
    await expect
      .poll(
        async () => {
          expect(
            writes.length,
            'One save must never create a second member command',
          ).toBeLessThanOrEqual(1);
          if (await unknown.isVisible()) outcome = 'unconfirmed';
          else if (responses[0]?.status() === 201) outcome = 'saved';
          else if (
            (responses[0]?.status() ?? 0) >= 400 &&
            responses[0]!.status() < 500 &&
            (await validation.isVisible())
          )
            outcome = 'validation';
          else if (writes.length === 0 && (await validation.isVisible())) outcome = 'validation';

          return outcome !== undefined;
        },
        {
          timeout: 5000,
          message:
            'Member save must reach success, accessible validation, or an explicit unknown outcome',
        },
      )
      .toBe(true);
    const reply = responses[0];
    if (reply) expect(await reply.finished()).toBeNull();
    const response: unknown = reply ? await reply.json() : null;
    const memberId = writes.length ? assertMemberCreatePayload(writes[0]!.body, rawName) : null;
    if (writes.length) {
      expect(memberId, 'The POST must use the UUID retained before submission').toBe(reservedId);
      expect(writes[0]).toMatchObject({ method: 'POST', path });
    }
    if (outcome === 'saved') {
      expect(response).toMatchObject({
        id: memberId,
        tripId,
        name: rawName.trim(),
        role: 'companion',
        isActive: true,
      });
      await expect(page.getByText(rawName.trim(), { exact: true })).toBeVisible();
    } else if (outcome === 'unconfirmed') {
      await expect(unknown).toBeVisible();
      await expect(input).toHaveValue(rawName);
    } else await expect(validation).toBeVisible();
    if (lost) {
      await expect
        .poll(() => lost.persisted !== undefined || lost.failure !== undefined, { timeout: 5000 })
        .toBe(true);
      await lost.mutationFinished;
      expect(
        lost.failure,
        'The dropped response must follow a genuinely successful real POST',
      ).toBeUndefined();
      expect(lost.persisted).toBeDefined();
      expect(outcome).toBe('unconfirmed');
      expect(memberId).toBe(lost.commandId);
      expect(lost.mutations).toHaveLength(1);
    }
    expect(writes.length).toBeLessThanOrEqual(1);
    world.set(memberCreateKey, {
      tripId,
      rawName,
      memberId,
      before,
      writes,
      status: reply?.status() ?? null,
      response,
      outcome: outcome!,
    } satisfies MemberCreate);
    world.set('splitting:browserMemberCommandId', memberId);
    if (memberId) world.set('splitting:memberId', memberId);
  } finally {
    page.off('request', capture);
    page.off('response', captureResponse);
  }
}
