import { Given } from '../../../support/fixtures.js';
import {
  arrangeExpenseCalendar,
  expenseCalendarPhrase,
} from '../../../support/splitting/expense-calendar.js';

Given(expenseCalendarPhrase, async ({ page, world }) => {
  await arrangeExpenseCalendar(page, world);
});
