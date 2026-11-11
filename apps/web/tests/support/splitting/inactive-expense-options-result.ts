import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { inactiveReferencedMemberStateKey } from './inactive-referenced-member-fixture.js';
import { expenseMemberOptionsKey, type ExpenseMemberOptions } from './expense-member-options.js';

export const inactiveExpenseOptionsPhrase = '新支出不可選取 {string}';

export interface MemberChoiceAvailability {
  id: string;
  disabled: boolean;
  selected: boolean;
}

/** Absent or natively disabled options cannot be selected by pointer or keyboard. */
export function assertInactiveMemberChoices(
  choices: readonly MemberChoiceAvailability[],
  inactiveId: string,
  activeIds: readonly string[],
): void {
  expect(new Set(choices.map((choice) => choice.id)).size).toBe(choices.length);
  for (const choice of choices.filter((row) => row.id === inactiveId)) {
    expect(choice.disabled, 'Inactive member must not be keyboard-selectable').toBe(true);
    expect(choice.selected, 'Inactive member must not already be selected').toBe(false);
  }
  expect(
    choices
      .filter((choice) => !choice.disabled)
      .map((choice) => choice.id)
      .sort(),
    'Every active member must remain available; no inactive ID can be selected',
  ).toEqual([...activeIds].sort());
}

export async function assertInactiveExpenseOptions(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  const originalResponse = world.response;
  const writes: string[] = [];
  const observe = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
    )
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on('request', observe);
  try {
    const fixture = world.get<{
      memberId: string;
      name: string;
      expenseId: string;
      after: BrowserSplittingSnapshot;
    }>(inactiveReferencedMemberStateKey);
    expect(fixture.name).toBe(name);
    const opened = world.get<ExpenseMemberOptions>(expenseMemberOptionsKey);
    expect(opened.status).toBe(200);
    expect(opened.writes).toEqual([]);
    expect(opened.before).toEqual(fixture.after);
    expect(opened.after).toEqual(fixture.after);
    expect(new URL(page.url()).pathname).toBe(`/trips/${opened.tripId}/expenses/new`);
    await expect(page.getByLabel('支出項目', { exact: true })).toBeVisible();
    const activeIds = opened.members.filter((member) => member.isActive).map((member) => member.id);
    expect(opened.members.find((member) => member.id === fixture.memberId)).toMatchObject({
      name,
      isActive: false,
      role: 'companion',
    });
    for (const role of ['radio', 'checkbox'] as const) {
      const controls = page.getByRole(role, { includeHidden: true });
      const choices = await controls.evaluateAll((elements) =>
        elements.map((element) => {
          if (!(element instanceof HTMLInputElement))
            throw new Error('Expense member choices must expose native radio/checkbox semantics');

          return {
            id: element.value,
            disabled: element.matches(':disabled'),
            selected: element.checked,
          };
        }),
      );
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
    expect(
      after,
      'Inspecting unavailable choices must preserve the complete historical ledger',
    ).toEqual(fixture.after);
    expect(
      after.expenses.items
        .find((expense) => expense.id === fixture.expenseId)
        ?.shares.some((share) => share.memberId === fixture.memberId),
    ).toBe(true);
    expect(writes, 'Then must inspect choices without selecting or submitting any command').toEqual(
      [],
    );
  } finally {
    page.off('request', observe);
    world.response = originalResponse;
  }
}
