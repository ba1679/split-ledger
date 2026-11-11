import { When } from '../../../support/fixtures.js';
import { toggleSimplification } from '../../../support/splitting/toggle-simplification.js';

When('owner 關閉簡化付款', async ({ page, world }) => {
  await toggleSimplification(page, world, false);
});
