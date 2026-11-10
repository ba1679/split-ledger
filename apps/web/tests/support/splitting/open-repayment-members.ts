import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { IndependentRepaymentForm } from './repayment-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const openRepaymentMembersPhrase = 'owner 開啟獨立還款的成員選項';

export const openedRepaymentMembersKey = 'splitting:openedRepaymentMembers';

export interface OpenedRepaymentMembers {
  tripId: string;
  members: BrowserDirectoryMember[];
  writes: string[];
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
}

/** Opens just the real repayment form and observes its directory; never fills or saves. */
export async function openRepaymentMembers(page: Page, world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  const writes: string[] = [];
  const onRequest = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()))
      writes.push(`${request.method()} ${path}`);
  };
  page.on('request', onRequest);
  try {
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === `/api/trips/${tripId}/members`,
      ),
      new IndependentRepaymentForm(page).open(tripId),
    ]);
    expect(response.status(), 'Repayment member choices must load the actual directory').toBe(200);
    const { items } = (await response.json()) as { items: BrowserDirectoryMember[] };
    expect(Array.isArray(items), 'The member directory must contain items').toBe(true);
    expect(items.map((member) => member.id).sort()).toEqual(
      before.sources.members.map((member) => member.id).sort(),
    );
    await expect(page.getByRole('combobox', { name: '付款人', exact: true })).toBeEnabled();
    await expect(page.getByRole('combobox', { name: '收款人', exact: true })).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/repayments/new$`));
    const after = await readBrowserSplittingSnapshot(world);
    expect(after, 'Opening repayment choices must preserve members and financial history').toEqual(
      before,
    );
    expect(writes, 'Opening member choices must not submit a mutation').toEqual([]);
    world.set(openedRepaymentMembersKey, {
      tripId,
      members: items,
      writes,
      before,
      after,
    } satisfies OpenedRepaymentMembers);
  } finally {
    page.off('request', onRequest);
  }
}
