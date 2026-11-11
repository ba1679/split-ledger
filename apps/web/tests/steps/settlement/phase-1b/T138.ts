import { Given } from '../../../support/fixtures.js';
import {
  arrangeSettlementCalendar,
  settlementCalendarPhrase,
} from '../../../support/splitting/settlement-calendar.js';

Given(settlementCalendarPhrase, async ({ page, world }) => {
  await arrangeSettlementCalendar(page, world);
});
