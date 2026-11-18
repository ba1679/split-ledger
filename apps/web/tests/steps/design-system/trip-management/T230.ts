import { Then } from '../../../support/fixtures.js';
import { assertKeyboardConfirmation } from '../../../support/loading/keyboard-confirmation.js';

Then('確認的名稱後果與安全焦點可辨識', async ({ world }) => {
  await assertKeyboardConfirmation(world);
});
