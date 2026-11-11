import { When } from '../../../support/fixtures.js';
import {
  closeCalendarWithEscape,
  escapeCalendarPhrase,
} from '../../../support/splitting/calendar-escape.js';

When(escapeCalendarPhrase, async ({ page, world }) => {
  await closeCalendarWithEscape(page, world);
});
