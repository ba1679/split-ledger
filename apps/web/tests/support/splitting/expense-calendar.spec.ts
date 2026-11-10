import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { SharedExpenseForm } from './expense-draft.js';
import { arrangeExpenseCalendar, expenseCalendarPhrase } from './expense-calendar.js';
import {
  calendarContextKey,
  openCustomDateCalendar,
  type CalendarContext,
} from './calendar-context.js';

for (const width of [1280, 375]) {
  test(`T117: isolated owner expense calendar Given at ${width}px`, async ({ page, world }) => {
    await page.setViewportSize({ width, height: 812 });
    await runIsolatedStep(
      {
        phrase: expenseCalendarPhrase,
        input: undefined,
        execute: async (context) => arrangeExpenseCalendar(page, context),
      },
      world,
    );
    expect(world.get<CalendarContext>(calendarContextKey).initialDate).toBe('2027-03-11');
  });

  test(`T117: shared DateField opens with real selected-day focus at ${width}px`, async ({
    page,
    world,
  }) => {
    // Exercises the actual existing component independently of the pending 005 schema.
    const trip = await seedTrip(world, '日本旅行');
    await page.setViewportSize({ width, height: 812 });
    await login(page, world);
    await new SharedExpenseForm(page).open(trip.id);
    const before = await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [
      trip.id,
    ]);
    const writes: string[] = [];
    page.on('request', (request) => {
      if (
        ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) &&
        new URL(request.url()).pathname.startsWith('/api/trips/')
      )
        writes.push(request.method());
    });
    await openCustomDateCalendar(page, world, '支出日期');
    expect(writes).toEqual([]);
    expect(
      (await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [trip.id])).rows,
    ).toEqual(before.rows);
  });
}
