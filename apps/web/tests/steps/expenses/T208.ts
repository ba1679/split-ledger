import { Then } from '../../support/fixtures.js';
import { checkInput } from '../../support/expense-helpers.js';

Then('金額仍為 12.50', async ({ page, world }) => {
  await checkInput(page, world, '12.50');
});
