import { Given } from '../../../support/fixtures.js';
import { arrangePagination } from '../../../support/loading/pagination-fixture.js';

Given('支出已有 20 筆與確認總額且另有 5 筆未顯示', async ({ page, world }) => {
  await arrangePagination(page, world);
});
