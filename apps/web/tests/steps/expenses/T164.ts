import { When } from '../../support/fixtures.js';
import { amountInput } from '../../support/expense-helpers.js';

When("使用者嘗試輸入第三位小數", async ({ page }) => {
 await amountInput(page).press('End'); await amountInput(page).pressSequentially('1');
});
