import { expect, type APIResponse, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { accessBrowserStateKey, type AccessBrowserState } from './other-account-browser-fixture.js';

export const directSplittingAccessPhrase = '使用者直達目前旅行分帳';

export const directSplittingAccessKey = 'splitting:directSplittingAccess';

export interface ProtectedAccessReply {
  path: string;
  status: number;
  body: unknown;
  origin: 'page' | 'anonymous-probe';
}

export interface DirectSplittingAccess {
  browser: AccessBrowserState;
  path: string;
  replies: ProtectedAccessReply[];
  writes: string[];
}

/** Capture only this trip's protected responses, never the actor's own auth profile. */
async function captureReply(
  response: Response | APIResponse,
  origin: ProtectedAccessReply['origin'],
): Promise<ProtectedAccessReply> {
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // Preserve non-JSON failures too: the later privacy assertion must inspect all payloads.
  }

  return { path: new URL(response.url()).pathname, status: response.status(), body, origin };
}

/** One direct navigation with the Given actor; no owner request hydrates this page. */
export async function navigateToProtectedSplitting(
  state: Pick<AccessBrowserState, 'page' | 'context' | 'actor' | 'owner' | 'tripId'>,
): Promise<Omit<DirectSplittingAccess, 'browser'>> {
  const { page, context, tripId, actor, owner } = state;
  expect(page.context()).toBe(context);
  expect(actor?.id).not.toBe(owner.id);
  const path = `/trips/${tripId}/settlement`;
  const apiPath = `/api/trips/${tripId}`;
  const writes: string[] = [];
  const responses: Response[] = [];
  const recordWrite = (request: import('@playwright/test').Request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith('/api/') &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())
    )
      writes.push(`${request.method()} ${url.pathname}`);
  };
  const recordResponse = (response: Response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname === apiPath || pathname.startsWith(`${apiPath}/`)) responses.push(response);
  };
  page.on('request', recordWrite);
  page.on('response', recordResponse);
  try {
    await page.goto(path);
    const replies: ProtectedAccessReply[] = [];
    if (actor) {
      await expect
        .poll(() => responses.some((reply) => reply.status() === 404), {
          message: 'Non-owner direct access must receive a real protected trip GET 404',
        })
        .toBe(true);
      await expect(
        page
          .getByRole('alert')
          .or(page.getByRole('heading', { name: /找不到|無法|拒絕/ }))
          .first(),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole('button', { name: '使用 Google 帳號登入', exact: true }),
      ).toBeVisible();
      // PrivatePage rejects before mounting private queries. Verify backend denial with the
      // same anonymous context; its result is retained for inspection and never rendered.
      const reply = await context.request.get(apiPath);
      expect(reply.status(), 'Anonymous context must receive 401 from the real trip API').toBe(401);
      replies.push(await captureReply(reply, 'anonymous-probe'));
    }
    for (const response of responses) {
      await response.finished();
      replies.push(await captureReply(response, 'page'));
    }
    expect(writes, 'Direct access must not submit any member or financial mutation').toEqual([]);

    return { path, replies, writes };
  } finally {
    page.off('request', recordWrite);
    page.off('response', recordResponse);
  }
}

export async function directSplittingAccess(world: LedgerWorld): Promise<void> {
  const browser = world.get<AccessBrowserState>(accessBrowserStateKey);
  const result = await navigateToProtectedSplitting(browser);
  world.set(directSplittingAccessKey, { browser, ...result } satisfies DirectSplittingAccess);
}
