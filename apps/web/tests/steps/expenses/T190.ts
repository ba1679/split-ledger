import { Given, expect } from '../../support/fixtures.js';
import { dateInput, fixedDate } from '../../support/expense-helpers.js';

Given("支出表單日期預設為 \"2027-03-11\"", async ({ page, world }) => {
 await fixedDate(page, world, true); await expect(dateInput(page)).toHaveValue('2027/03/11');
});
