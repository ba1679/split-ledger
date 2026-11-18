import { Given } from '../../../support/fixtures.js';
import { arrangePagination } from '../../../support/loading/pagination-fixture.js';
import { loadMore } from '../../../support/loading/load-more.js';
import { assertPaginationBusy } from '../../../support/loading/pagination-busy.js';

Given('第二頁支出正在讀取且原次回應可完成', async ({ page, world }) => {
  await arrangePagination(page, world);
  await loadMore(world);
  await assertPaginationBusy(world);
});
