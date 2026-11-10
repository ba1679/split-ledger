import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { viewedMembersKey, type ViewedMembers } from './view-members.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const ownerMemberControlsPhrase = 'owner Alice 不提供停用與刪除操作';

/** Read-only accessibility and tab-order checks for the owner lifecycle entries. */
export async function assertOwnerLifecycleControlsUnavailable(page: Page): Promise<void> {
  for (const role of ['button', 'link', 'menuitem'] as const) {
    const controls = page.getByRole(role, {
      name: /(?:停用|刪除).*Alice|Alice.*(?:停用|刪除)/,
      includeHidden: true,
    });
    for (const control of await controls.all()) {
      if (await control.isVisible()) await expect(control).toBeDisabled();
    }
  }
  const keyboardEntries = await page.locator('body').evaluate((body) =>
    [
      ...body.querySelectorAll<HTMLElement>(
        'button,a,input,[role="button"],[role="menuitem"],[tabindex]',
      ),
    ]
      .filter((element) => {
        const name = element.getAttribute('aria-label') ?? element.textContent ?? '';
        if (!/(?:停用|刪除).*Alice|Alice.*(?:停用|刪除)/.test(name)) return false;
        const style = getComputedStyle(element);

        return (
          element.tabIndex >= 0 &&
          !element.matches(':disabled') &&
          !element.closest('[inert],[hidden],[aria-hidden="true"]') &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          element.getClientRects().length > 0
        );
      })
      .map((element) => element.outerHTML),
  );
  expect(keyboardEntries, 'Owner deactivation/deletion must have no keyboard entry').toEqual([]);
}

/** Inspect the current directory only; never try an illegal owner mutation to prove UI safety. */
export async function assertOwnerMemberControls(page: Page, world: LedgerWorld): Promise<void> {
  const viewed = world.get<ViewedMembers>(viewedMembersKey);
  const ownerId = splittingMemberId(world, 'Alice');
  expect(viewed.status).toBe(200);
  expect(viewed.writes, 'The directory action must not submit owner mutations').toEqual([]);
  expect(viewed.members.find((member) => member.id === ownerId)).toMatchObject({
    name: 'Alice',
    role: 'owner',
    isActive: true,
  });
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText('Alice', { exact: true })).toBeVisible();
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
    await assertOwnerLifecycleControlsUnavailable(page);
    const response = await callApi(world, 'GET', `/api/trips/${viewed.tripId}/members/${ownerId}`);
    expect(response.status(), 'The immutable owner must remain readable').toBe(200);
    const owner = (await response.json()) as BrowserDirectoryMember;
    expect(owner).toMatchObject({
      id: ownerId,
      tripId: viewed.tripId,
      name: 'Alice',
      role: 'owner',
      isActive: true,
    });
    expect(
      await readBrowserSplittingSnapshot(world),
      'Inspecting owner controls must preserve all authoritative data',
    ).toEqual(viewed.before);
    expect(writes, 'Inspecting owner controls must never send a mutation').toEqual([]);
  } finally {
    page.off('request', capture);
  }
}
