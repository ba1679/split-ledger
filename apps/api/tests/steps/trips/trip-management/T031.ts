import { Then } from '../../../support/fixtures.js';
import { assertOriginalAndCurrent } from '../../../support/trip-management/receipt-result.js';

Then('查證分別回傳原操作結果與目前權威狀態', async ({ world }) => {
  await assertOriginalAndCurrent(world);
});
