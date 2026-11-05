import { Then } from '../../support/fixtures.js';
import { assertUnknown } from '../../support/expense-helpers.js';

Then("畫面提示保存結果尚未確認並保留原草稿", async ({ page, world }) => {
 await assertUnknown(page, world, false);
});
