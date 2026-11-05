import { Then, expect } from '../../support/fixtures.js';
import { amountInput, checkInput } from '../../support/expense-helpers.js';

Then("表單幣別顯示 \"JPY\" 且金額只接受整數", async ({ page, world }) => {
 await expect(page.getByRole('combobox',{name:'幣別',exact:true})).toHaveValue(/^JPY\b/); await amountInput(page).fill('100'); await amountInput(page).pressSequentially('.'); await checkInput(page, world, '100');
});
