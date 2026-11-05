import { When } from '../../support/fixtures.js';
import { save } from '../../support/expense-helpers.js';

When("使用者保存支出", async ({ page, world }) => {
 await save(page, world);
});
