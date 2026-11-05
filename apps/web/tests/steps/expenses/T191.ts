import { Given } from '../../support/fixtures.js';
import { arrangePagination } from '../../support/expense-helpers.js';

Given("旅行支出跨越兩頁且總額包含全部支出", async ({ page, world }) => {
 await arrangePagination(page, world);
});
