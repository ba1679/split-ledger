import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { calendarContextKey, type CalendarContext } from './calendar-context.js';
import { arrangeSettlementCalendar, settlementCalendarPhrase } from './settlement-calendar.js';

for (const width of [1280, 375])
  test(`T138: isolated settlement calendar Given at ${width}px`, async ({ page, world }) => {
    await page.setViewportSize({ width, height: 812 });
    await runIsolatedStep(
      {
        phrase: settlementCalendarPhrase,
        input: undefined,
        execute: (context) => arrangeSettlementCalendar(page, context),
      },
      world,
    );
    const calendar = world.get<CalendarContext>(calendarContextKey);
    expect(calendar.label).toBe('結清日期');
    expect(calendar.initialDate).toBe('2027-03-11');
    await expect(calendar.dialog).toBeVisible();
  });
