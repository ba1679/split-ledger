import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { SharedExpenseForm } from './expense-draft.js';
import { arrangeExpenseCalendar } from './expense-calendar.js';
import { openCustomDateCalendar } from './calendar-context.js';
import { closeCalendarWithEscape, pressEscapeOnCalendar } from './calendar-escape.js';
import {
  assertCalendarControls,
  assertUnchangedCalendarDate,
  unchangedCalendarDatePhrase,
} from './calendar-result.js';

test('T111: isolated unchanged date Then reads full accounting after Escape', async ({
  page,
  world,
}) => {
  await arrangeExpenseCalendar(page, world);
  await closeCalendarWithEscape(page, world);
  await runIsolatedStep(
    {
      phrase: unchangedCalendarDatePhrase,
      input: undefined,
      execute: assertUnchangedCalendarDate,
    },
    world,
  );
});

for (const width of [1280, 375]) {
  test(`T111: actual DateField cancellation result at ${width}px`, async ({ page, world }) => {
    const trip = await seedTrip(world, '日本旅行');
    await page.setViewportSize({ width, height: 812 });
    await login(page, world);
    await new SharedExpenseForm(page).open(trip.id);
    const context = await openCustomDateCalendar(page, world, '支出日期');
    const before = await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [
      trip.id,
    ]);
    const writes: string[] = [];
    page.on('request', (request) => {
      if (
        ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) &&
        new URL(request.url()).pathname.startsWith('/api/')
      )
        writes.push(request.method());
    });
    await pressEscapeOnCalendar(page, context);
    await assertCalendarControls(context, '2027-03-11');
    expect(writes).toEqual([]);
    expect(
      (await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [trip.id])).rows,
    ).toEqual(before.rows);
  });
}
