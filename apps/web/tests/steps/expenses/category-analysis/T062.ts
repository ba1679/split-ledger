import { Given } from '../../../support/fixtures.js';
import { addAnalysisFromOtherDevice } from '../../../support/category-analysis/states.js';

Given(
  '另一裝置已新增餐飲 {string} {word} 且由 Alice 與 Amy 分攤',
  async ({ page, world }, currency, amount) => {
    await addAnalysisFromOtherDevice(page, world, currency, amount);
  },
);
