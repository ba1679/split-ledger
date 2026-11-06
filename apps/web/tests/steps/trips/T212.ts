import { When } from '../../support/fixtures.js';
import { tripEnd } from '../../support/accounts-categories-trips.js';

When('使用者將結束日 "2027-03-15" 保存到 "日本旅行"', async ({ page }) => {
  await tripEnd(page, '2027-03-15');
});
