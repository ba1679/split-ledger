import { When } from '../../../support/fixtures.js';
import { enterKeyboardDateState } from '../../../support/loading/keyboard-date-state.js';

When('日期保存進入本例指定狀態', async ({ world }) => {
  await enterKeyboardDateState(world);
});
