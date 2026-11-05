import { Then, expect } from '../../support/fixtures.js';
import { dateInput, noCreation } from '../../support/expense-helpers.js';

Then("支出日期預設為 \"2027-03-11\" 且可修改", async ({ page, world }) => {
 await expect(dateInput(page)).toHaveValue('2027/03/11'); await expect(dateInput(page)).toBeEditable(); await dateInput(page).fill('2027/03/12'); await expect(dateInput(page)).toHaveValue('2027/03/12'); await noCreation(world);
});
