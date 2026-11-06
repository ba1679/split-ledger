import { When } from '../../support/fixtures.js';
import { tripCreate } from '../../support/accounts-categories-trips.js';

When('使用者建立名稱為 "台南旅行"、未填開始日且結束日為 "2027-04-05" 的旅行', async ({ page }) => {
  await tripCreate(page, '台南旅行', null, '2027-04-05');
});
