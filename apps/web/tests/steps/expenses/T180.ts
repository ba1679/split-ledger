import { When } from '../../support/fixtures.js';
import { chooseCurrency } from '../../support/expense-helpers.js';

When("使用者搜尋並選擇 \"JPY\" 幣別", async ({ page }) => {
 await chooseCurrency(page, 'JPY');
});
