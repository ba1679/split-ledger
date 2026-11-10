import { When } from '../../../support/fixtures.js';
import { replaceDinnerSharing } from '../../../support/splitting/replace-dinner-sharing-command.js';

When('owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200', async ({ world }) => {
  await replaceDinnerSharing(world);
});
