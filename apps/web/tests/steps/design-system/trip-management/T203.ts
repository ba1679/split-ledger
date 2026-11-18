import { Then } from '../../../support/fixtures.js';
import { assertPaginationComplete } from '../../../support/loading/pagination-result.js';

Then('列表恰有 25 筆不同支出且總額保持', async ({ world }) => {
  await assertPaginationComplete(world);
});
