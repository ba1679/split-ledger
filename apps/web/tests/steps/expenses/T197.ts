import { Then } from '../../support/fixtures.js';
import { assertUnknown } from '../../support/expense-helpers.js';

Then("畫面查證原支出已保存且不重複新增", async ({ page, world }) => {
 await assertUnknown(page, world, true);
});
