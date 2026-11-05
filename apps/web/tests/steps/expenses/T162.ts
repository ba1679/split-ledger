import { When } from '../../support/fixtures.js';
import { deleteLodging } from '../../support/expense-helpers.js';

When("使用者刪除住宿支出", async ({ page, world }) => {
 await deleteLodging(page, world);
});
