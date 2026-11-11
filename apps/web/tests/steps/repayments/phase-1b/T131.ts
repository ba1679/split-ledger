import { Given } from '../../../support/fixtures.js';
import {
  arrangeRepaymentCalendar,
  repaymentCalendarPhrase,
} from '../../../support/splitting/repayment-calendar.js';

Given(repaymentCalendarPhrase, async ({ page, world }) => {
  await arrangeRepaymentCalendar(page, world);
});
