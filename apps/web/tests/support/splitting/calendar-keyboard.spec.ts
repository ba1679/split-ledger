import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { SharedExpenseForm } from './expense-draft.js';
import { arrangeExpenseCalendar } from './expense-calendar.js';
import { openCustomDateCalendar } from './calendar-context.js';
import {
  chooseCalendarDateWithKeyboard,
  keyboardDatePhrase,
  selectMarchTwelfthWithKeyboard,
} from './calendar-keyboard.js';

test('T107: isolated keyboard date When retains real accounting evidence', async ({
  page,
  world,
}) => {
  await arrangeExpenseCalendar(page, world);
  await runIsolatedStep(
    {
      phrase: keyboardDatePhrase,
      input: undefined,
      execute: async (context) => chooseCalendarDateWithKeyboard(page, context),
    },
    world,
  );
});

for (const width of [1280, 375]) {
  test(`T107: actual DateField ArrowRight/Enter selection at ${width}px`, async ({
    page,
    world,
  }) => {
    // Verify the exact keyboard Act on the existing component even before 005 schema exists.
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
    await selectMarchTwelfthWithKeyboard(page, context);
    await expect(context.input).toHaveValue('2027/03/12');
    expect(writes).toEqual([]);
    expect(
      (await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [trip.id])).rows,
    ).toEqual(before.rows);
  });
}
