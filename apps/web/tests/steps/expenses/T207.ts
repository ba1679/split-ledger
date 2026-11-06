import { Then } from '../../support/fixtures.js';
import { checkInput } from '../../support/expense-helpers.js';

Then('金額仍為 100 且沒有負號', async ({ page, world }) => {
  await checkInput(page, world, '100');
});
