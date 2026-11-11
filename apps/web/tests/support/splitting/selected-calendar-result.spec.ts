import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { SharedExpenseForm } from './expense-draft.js';
import { arrangeExpenseCalendar } from './expense-calendar.js';
import { openCustomDateCalendar } from './calendar-context.js';
import {
  chooseCalendarDateWithKeyboard,
  selectMarchTwelfthWithKeyboard,
} from './calendar-keyboard.js';
import {
  assertSelectedCalendarControls,
  assertSelectedCalendarDate,
  selectedCalendarDatePhrase,
} from './selected-calendar-result.js';

test('T112: isolated selected date Then reads full accounting after keyboard selection', async ({
  page,
  world,
}) => {
  await arrangeExpenseCalendar(page, world);
  await chooseCalendarDateWithKeyboard(page, world);
  await runIsolatedStep(
    { phrase: selectedCalendarDatePhrase, input: undefined, execute: assertSelectedCalendarDate },
    world,
  );
});

for (const width of [1280, 375]) {
  test(`T112: actual DateField selected result at ${width}px`, async ({ page, world }) => {
    const trip = await seedTrip(world, '日本旅行');
    await page.setViewportSize({ width, height: 812 });
    await login(page, world);
    await new SharedExpenseForm(page).open(trip.id);
    const context = await openCustomDateCalendar(page, world, '支出日期');
    const dialog = await context.dialog.boundingBox();
    expect(dialog).not.toBeNull();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(width);
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
    await selectMarchTwelfthWithKeyboard(page, context);
    await assertSelectedCalendarControls(context);
    expect(writes).toEqual([]);
    expect(
      (await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [trip.id])).rows,
    ).toEqual(before.rows);
  });
}
