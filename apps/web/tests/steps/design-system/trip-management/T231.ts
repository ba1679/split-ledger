import { Given } from '../../../support/fixtures.js';
import { arrangeKeyboardDate } from '../../../support/loading/keyboard-date.js';

Given('日期保存已送出且即將 {string}', async ({ world }, result: string) => {
  await arrangeKeyboardDate(world, result);
});
