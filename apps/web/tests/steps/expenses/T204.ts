import { Then, expect } from '../../support/fixtures.js';
import { dateInput, noCreation } from '../../support/expense-helpers.js';

Then("表單日期顯示 \"2027-01-15\"", async ({ page, world }) => {
 await expect(dateInput(page)).toHaveValue('2027/01/15'); await noCreation(world);
});
