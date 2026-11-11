import { When } from '../../../support/fixtures.js';
import {
  chooseCalendarDateWithKeyboard,
  keyboardDatePhrase,
} from '../../../support/splitting/calendar-keyboard.js';

When(keyboardDatePhrase, async ({ page, world }) => {
  await chooseCalendarDateWithKeyboard(page, world);
});
