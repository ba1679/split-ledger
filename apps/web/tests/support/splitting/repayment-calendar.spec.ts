import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { calendarContextKey, type CalendarContext } from './calendar-context.js';
import { IndependentRepaymentForm } from './repayment-draft.js';
import { arrangeRepaymentCalendar, repaymentCalendarPhrase } from './repayment-calendar.js';

for (const width of [1280, 375]) {
  test(`T131: isolated repayment calendar Given at ${width}px`, async ({ page, world }) => {
    await page.setViewportSize({ width, height: 812 });
    await runIsolatedStep(
      {
        phrase: repaymentCalendarPhrase,
        input: undefined,
        execute: (context) => arrangeRepaymentCalendar(page, context),
      },
      world,
    );
    const calendar = world.get<CalendarContext>(calendarContextKey);
    expect(calendar.label).toBe('還款日期');
    expect(calendar.initialDate).toBe('2027-03-11');
    await expect(calendar.dialog).toBeVisible();
  });

  test(`T131: actual repayment page must provide its DateField at ${width}px`, async ({
    page,
    world,
  }) => {
    const trip = await seedTrip(world, '日本旅行');
    await page.setViewportSize({ width, height: 812 });
    await login(page, world);
    await new IndependentRepaymentForm(page).open(trip.id);
    const { openCustomDateCalendar } = await import('./calendar-context.js');
    await openCustomDateCalendar(page, world, '還款日期');
  });
}
