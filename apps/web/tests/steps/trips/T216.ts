import { When } from '../../support/fixtures.js';
import { tripCreate } from '../../support/accounts-categories-trips.js';

When('使用者建立名稱為 "日本旅行"、開始日為 "2027-03-10" 且未填結束日的旅行', async ({ page }) => {
  await tripCreate(page, '日本旅行', '2027-03-10');
});
