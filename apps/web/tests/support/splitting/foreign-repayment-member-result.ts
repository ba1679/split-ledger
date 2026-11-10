import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { otherTripCarolStateKey, type OtherTripCarolFixture } from './other-trip-carol-fixture.js';
import {
  independentRepaymentMembersKey,
  type IndependentRepaymentMembers,
} from './open-independent-repayment-members.js';

export const foreignRepaymentMemberUnavailablePhrase = '本旅行還款選單不可選取 Carol';

export interface RepaymentMemberChoice {
  id: string;
  name: string;
  disabled: boolean;
  selected: boolean;
}

/** The entire native option list is inspected, including hidden/disabled entries.
 * An absent foreign option cannot be reached by keyboard either; Then never selects it.
 */
export function assertCurrentTripRepaymentChoices(
  choices: readonly RepaymentMemberChoice[],
  foreignId: string,
  currentIds: readonly string[],
): void {
  expect(choices.some((choice) => choice.id === foreignId || choice.name === 'Carol')).toBe(false);
  const members = choices.filter((choice) => choice.id !== '');
  expect(new Set(members.map((choice) => choice.id)).size).toBe(members.length);
  expect(members.map((choice) => choice.id).sort()).toEqual([...currentIds].sort());
  expect(members.every((choice) => !choice.disabled)).toBe(true);
  expect(
    choices
      .filter((choice) => choice.selected)
      .every((choice) => choice.id === '' || currentIds.includes(choice.id)),
  ).toBe(true);
}

export async function assertForeignRepaymentMemberUnavailable(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const originalResponse = world.response;
  const fixture = world.get<OtherTripCarolFixture>(otherTripCarolStateKey);
  const originalOtherResponse = fixture.otherWorld.response;
  const writes: string[] = [];
  const observe = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()))
      writes.push(`${request.method()} ${path}`);
  };
  page.on('request', observe);
  try {
    const opened = world.get<IndependentRepaymentMembers>(independentRepaymentMembersKey);
    expect(opened.tripId).toBe(fixture.currentTripId);
    expect(opened.before).toEqual(fixture.currentBefore);
    expect(opened.after).toEqual(fixture.currentBefore);
    expect(opened.writes).toEqual([]);
    expect(opened.members.map((member) => member.id).sort()).toEqual(
      fixture.currentMembers.map((member) => member.id).sort(),
    );
    expect(opened.members.some((member) => member.id === fixture.memberId)).toBe(false);
    expect(new URL(page.url()).pathname).toBe(`/trips/${fixture.currentTripId}/repayments/new`);
    const currentIds = fixture.currentBefore.sources.members.map((member) => String(member.id));
    for (const [role, label] of [
      ['payer', '付款人'],
      ['payee', '收款人'],
    ] as const) {
      expect(opened.choices[role].some((choice) => choice.id === fixture.memberId)).toBe(false);
      const control = page.getByRole('combobox', { name: label, exact: true });
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
      const choices = await control.evaluate((element) => {
        if (!(element instanceof HTMLSelectElement))
          throw new Error('Repayment member controls must expose native select semantics');

        return Array.from(element.options).map((option) => ({
          id: option.value,
          name: option.textContent?.trim() ?? '',
          disabled: option.matches(':disabled'),
          selected: option.selected,
        }));
      });
      assertCurrentTripRepaymentChoices(choices, fixture.memberId, currentIds);
    }
    expect(await readBrowserSplittingSnapshot(world)).toEqual(fixture.currentBefore);
    expect(await readBrowserSplittingSnapshot(fixture.otherWorld)).toEqual(fixture.otherBefore);
    expect(writes, 'Inspecting repayment options must not submit any write').toEqual([]);
  } finally {
    page.off('request', observe);
    world.response = originalResponse;
    fixture.otherWorld.response = originalOtherResponse;
  }
}
