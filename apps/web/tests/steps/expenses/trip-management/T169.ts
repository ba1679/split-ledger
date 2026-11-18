import { Given } from '../../../support/fixtures.js';
import { arrangeExpenseDeleteVerification } from '../../../support/expenses/delete-verification-fixture.js';

Given(
  '原支出刪除結果未知且旅行目前為 {string}',
  async ({ page, browser, world }, state: string) => {
    await arrangeExpenseDeleteVerification(page, browser, world, state);
  },
);
