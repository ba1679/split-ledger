import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const expenseMemberOptionsPhrase = 'owner 開啟新支出的成員選項';

export const expenseMemberOptionsKey = 'splitting:browserExpenseMemberOptions';

export interface ExpenseMemberOptions {
  tripId: string;
  members: BrowserDirectoryMember[];
  status: number;
  writes: string[];
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

/** Open only the new expense form; preserve all selections and submit nothing. */
export async function openExpenseMemberOptions(page: Page, world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  const writes: string[] = [];
  const onRequest = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
      writes.push(`${request.method()} ${path}`);
  };
  page.on('request', onRequest);
  try {
    const memberQuery = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname === `/api/trips/${tripId}/members`,
    );
    await page.goto(`/trips/${tripId}/expenses/new`);
    const response = await memberQuery;
    expect(response.status(), 'New expense member options must query the real trip directory').toBe(
      200,
    );
    const body = (await response.json()) as { items: BrowserDirectoryMember[] };
    expect(Array.isArray(body.items), 'Members query must provide a directory projection').toBe(
      true,
    );
    await expect(page.getByLabel('支出項目', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('radio').first(),
      'New expenses must expose payer choices',
    ).toBeVisible();
    await expect(
      page.getByRole('checkbox').first(),
      'New expenses must expose sharing choices',
    ).toBeVisible();
    const after = await readBrowserSplittingSnapshot(world);
    expect(after, 'Opening new expense options must preserve all authoritative data').toEqual(
      before,
    );
    expect(writes, 'Opening member options must not submit any mutation').toEqual([]);
    world.set(expenseMemberOptionsKey, {
      tripId,
      members: body.items,
      status: response.status(),
      writes,
      before,
      after,
    } satisfies ExpenseMemberOptions);
  } finally {
    page.off('request', onRequest);
  }
}
