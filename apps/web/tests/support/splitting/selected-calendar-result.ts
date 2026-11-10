import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { calendarContextKey, type CalendarContext } from './calendar-context.js';
import { calendarActionEvidenceKey, type CalendarActionEvidence } from './calendar-keyboard.js';
import { assertCalendarControls } from './calendar-result.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const selectedCalendarDatePhrase = '日期欄顯示 2027-03-12 且日曆關閉並返回日期觸發點';

export async function assertSelectedCalendarControls(context: CalendarContext): Promise<void> {
  await assertCalendarControls(context, '2027-03-12');
  for (const control of [context.input, context.trigger]) {
    const bounds = await control.boundingBox();
    expect(bounds, 'Date controls must remain readable after selection').not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(0);
    expect(bounds!.height).toBeGreaterThan(0);
    const viewportWidth = await control.evaluate(() => document.documentElement.clientWidth);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewportWidth);
  }
  expect(
    await context.input.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    'The date form must not overflow horizontally on mobile or desktop',
  ).toBe(true);
}

/** Reads the result of the one keyboard selection; never changes date, focus, or dialog state. */
export async function assertSelectedCalendarDate(world: LedgerWorld): Promise<void> {
  const context = world.get<CalendarContext>(calendarContextKey);
  const evidence = world.get<CalendarActionEvidence>(calendarActionEvidenceKey);
  expect(context.initialDate).toBe('2027-03-11');
  expect(evidence.initialDate).toBe('2027-03-11');
  await expect(
    evidence.trigger,
    'Focus must return to the original initiating control',
  ).toBeFocused();
  await assertSelectedCalendarControls(context);
  expect(evidence.writes, 'Choosing a date must not save accounting data').toEqual([]);
  const after = await readBrowserSplittingSnapshot(world);
  expect(
    after,
    'Date selection must preserve authoritative accounting sources and projections',
  ).toEqual(evidence.before);
  expect(evidence.writes).toEqual([]);
}
