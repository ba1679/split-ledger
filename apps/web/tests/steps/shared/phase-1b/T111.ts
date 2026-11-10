import { Then } from '../../../support/fixtures.js';
import {
  assertUnchangedCalendarDate,
  unchangedCalendarDatePhrase,
} from '../../../support/splitting/calendar-result.js';

Then(unchangedCalendarDatePhrase, async ({ world }) => {
  await assertUnchangedCalendarDate(world);
});
