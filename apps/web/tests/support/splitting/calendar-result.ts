import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { calendarContextKey, type CalendarContext } from './calendar-context.js';
import { calendarActionEvidenceKey, type CalendarActionEvidence } from './calendar-keyboard.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const unchangedCalendarDatePhrase = '日期欄仍為 2027-03-11 且焦點返回日期觸發點';

/** Reads the original controls; never reopens the calendar or changes its value/focus. */
export async function assertCalendarControls(
  context: CalendarContext,
  date: string,
): Promise<void> {
  await expect(context.input).toBeVisible();
  await expect(context.input).toHaveValue(date.replaceAll('-', '/'));
  await expect(context.dialog).toBeHidden();
  await expect(context.trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(context.trigger).toBeFocused();
}

export async function assertUnchangedCalendarDate(world: LedgerWorld): Promise<void> {
  const context = world.get<CalendarContext>(calendarContextKey);
  const evidence = world.get<CalendarActionEvidence>(calendarActionEvidenceKey);
  expect(context.initialDate).toBe('2027-03-11');
  expect(evidence.initialDate).toBe('2027-03-11');
  // The original trigger retained by When must be the one that receives focus.
  await expect(evidence.trigger).toBeFocused();
  await assertCalendarControls(context, '2027-03-11');
  expect(evidence.writes, 'Cancelling the calendar must not submit any API write').toEqual([]);
  const after = await readBrowserSplittingSnapshot(world);
  expect(after, 'Escape must preserve authoritative accounting sources and projections').toEqual(
    evidence.before,
  );
  expect(evidence.writes).toEqual([]);
}
