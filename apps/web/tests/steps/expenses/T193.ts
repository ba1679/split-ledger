import { Then } from '../../support/fixtures.js';
import { assertTotal } from '../../support/expense-helpers.js';

Then("畫面分別顯示 TWD 8000 與 JPY 17000 總額", async ({ page, world }) => {
 await assertTotal(page, world, 'TWD', '8000'); await assertTotal(page, world, 'JPY', '17000');
});
