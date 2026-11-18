import { Then } from '../../../support/fixtures.js';
import { assertPaginationBusy } from '../../../support/loading/pagination-busy.js';

Then('原有支出與總額保持可見且只有尾端忙碌', async ({ world }) => {
  await assertPaginationBusy(world);
});
