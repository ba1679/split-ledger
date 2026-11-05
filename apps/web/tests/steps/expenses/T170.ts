import { When } from '../../support/fixtures.js';
import { dateInput } from '../../support/expense-helpers.js';

When("使用者將支出日期改為 \"2027-01-15\"", async ({ page }) => {
 await dateInput(page).fill('2027/01/15'); await dateInput(page).blur();
});
