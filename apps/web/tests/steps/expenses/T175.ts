import { Given } from '../../support/fixtures.js';
import { loseCreateResponse } from '../../support/expense-helpers.js';

Given('使用者已填妥支出且建立結果回應遺失', async ({ page, world }) => {
  await loseCreateResponse(page, world, false);
});
