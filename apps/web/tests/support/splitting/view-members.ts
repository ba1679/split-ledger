import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const viewMembersPhrase = 'owner 查看同行者管理';

export const viewedMembersKey = 'splitting:browserViewedMembers';

export interface ViewedMembers {
  tripId: string;
  status: number;
  members: BrowserDirectoryMember[];
  writes: string[];
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

/** Navigate once and observe the real directory query; never seed or submit members. */
export async function viewBrowserMembers(page: Page, world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  const writes: string[] = [];
  const onRequest = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
    )
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on('request', onRequest);
  try {
    const directoryQuery = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        new URL(response.url()).pathname === `/api/trips/${tripId}/members`,
    );
    await page.goto(`/trips/${tripId}/members`);
    const response = await directoryQuery;
    expect(response.status(), 'Viewing members must load the real owner directory').toBe(200);
    const reply = (await response.json()) as { items: BrowserDirectoryMember[] };
    expect(Array.isArray(reply.items), 'The members projection must contain items').toBe(true);
    await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
    const after = await readBrowserSplittingSnapshot(world);
    expect(after, 'Viewing the member directory must preserve all authoritative data').toEqual(
      before,
    );
    expect(writes, 'Viewing members must not submit a mutation').toEqual([]);
    world.set(viewedMembersKey, {
      tripId,
      status: response.status(),
      members: reply.items,
      writes,
      before,
      after,
    } satisfies ViewedMembers);
  } finally {
    page.off('request', onRequest);
  }
}
