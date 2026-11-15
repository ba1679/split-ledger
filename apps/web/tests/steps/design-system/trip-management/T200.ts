import { When } from '../../../support/fixtures.js';
import { loadMore } from '../../../support/loading/load-more.js';

When('owner 選擇載入更多支出', async ({ world }) => {
  await loadMore(world);
});
