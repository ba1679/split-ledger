import { Then } from '../../../support/fixtures.js';
import { assertOperationResult } from '../../../support/loading/operation-result.js';

Then('操作只得到一個 {string} 的已確認結果', async ({ page, browser, world }, result: string) => {
  await assertOperationResult(page, browser, world, result);
});
