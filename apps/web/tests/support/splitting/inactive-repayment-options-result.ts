import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { inactiveReferencedMemberStateKey } from './inactive-referenced-member-fixture.js';
import {
  openedRepaymentMembersKey,
  type OpenedRepaymentMembers,
} from './open-repayment-members.js';
import { assertInactiveMemberChoices } from './inactive-expense-options-result.js';

export const inactiveRepaymentOptionsPhrase = '獨立還款不可選取 {string}';

/** Inspect the already-open form; disabled native options cannot be selected by keyboard. */
export async function assertInactiveRepaymentOptions(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const originalResponse = world.response;
  const writes: string[] = [];
  const observe = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
      writes.push(`${request.method()} ${path}`);
  };
  page.on('request', observe);
  try {
    const fixture = world.get<{
      memberId: string;
      name: string;
      expenseId: string;
      after: BrowserSplittingSnapshot;
    }>(inactiveReferencedMemberStateKey);
    const opened = world.get<OpenedRepaymentMembers>(openedRepaymentMembersKey);
    expect(fixture.name).toBe(name);
    expect(opened.before).toEqual(fixture.after);
    expect(opened.after).toEqual(fixture.after);
    expect(opened.writes).toEqual([]);
    expect(new URL(page.url()).pathname).toBe(`/trips/${opened.tripId}/repayments/new`);
    expect(opened.members.find((member) => member.id === fixture.memberId)).toMatchObject({
      name,
      role: 'companion',
      isActive: false,
    });
    const activeIds = opened.members.filter((member) => member.isActive).map((member) => member.id);
    for (const label of ['付款人', '收款人']) {
      const control = page.getByRole('combobox', { name: label, exact: true });
      await expect(control).toBeEnabled();
      const choices = await control.evaluate((element) => {
        if (!(element instanceof HTMLSelectElement))
          throw new Error('Repayment member choices must expose native select semantics');

        return Array.from(element.options)
          .filter((option) => option.value !== '')
          .map((option) => ({
            id: option.value,
            disabled: option.matches(':disabled'),
            selected: option.selected,
          }));
      });
      assertInactiveMemberChoices(choices, fixture.memberId, activeIds);
    }
    const detail = await callApi(
      world,
      'GET',
      `/api/trips/${opened.tripId}/members/${fixture.memberId}`,
    );
    expect(detail.status(), 'Inactive historical member must remain readable').toBe(200);
    expect(await detail.json()).toMatchObject({
      id: fixture.memberId,
      tripId: opened.tripId,
      name,
      role: 'companion',
      isActive: false,
    });
    const after = await readBrowserSplittingSnapshot(world);
    expect(after, 'Inspecting repayment options must preserve all financial history').toEqual(
      fixture.after,
    );
    expect(
      after.expenses.items
        .find((expense) => expense.id === fixture.expenseId)
        ?.shares.some((share) => share.memberId === fixture.memberId),
    ).toBe(true);
    expect(writes, 'Then must not select a member or submit a command').toEqual([]);
  } finally {
    page.off('request', observe);
    world.response = originalResponse;
  }
}
