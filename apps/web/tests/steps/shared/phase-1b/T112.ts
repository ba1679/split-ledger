import { Then } from '../../../support/fixtures.js';
import {
  assertSelectedCalendarDate,
  selectedCalendarDatePhrase,
} from '../../../support/splitting/selected-calendar-result.js';

Then(selectedCalendarDatePhrase, async ({ world }) => {
  await assertSelectedCalendarDate(world);
});
