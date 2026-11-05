import { Then, expect } from '../../support/fixtures.js';
import { amountInput, checkInput } from '../../support/expense-helpers.js';

Then("表單幣別顯示 \"USD\" 且金額最多兩位小數", async ({ page, world }) => {
 await expect(page.getByRole('combobox',{name:'幣別',exact:true})).toHaveValue(/^USD\b/); await amountInput(page).fill('12.50'); await amountInput(page).pressSequentially('1'); await checkInput(page, world, '12.50');
});
