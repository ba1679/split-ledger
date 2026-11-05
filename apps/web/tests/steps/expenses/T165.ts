import { When } from '../../support/fixtures.js';
import { amountInput } from '../../support/expense-helpers.js';

When("使用者嘗試輸入負號", async ({ page }) => {
 await amountInput(page).press('Home'); await amountInput(page).pressSequentially('-');
});
