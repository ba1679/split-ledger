import { Then } from '../../../support/fixtures.js';
import { assertKeyboardDateResult } from '../../../support/loading/keyboard-date-result.js';

Then('可理解 {string} 且焦點未無故移走', async ({ world }, result: string) => {
  await assertKeyboardDateResult(world, result);
});
