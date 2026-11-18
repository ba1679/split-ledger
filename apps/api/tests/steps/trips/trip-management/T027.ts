import { When } from '../../../support/fixtures.js';
import { requestAsAccessor } from '../../../support/trip-management/access-request.js';

When('該存取者嘗試 {string}', async ({ world }, access: string) => {
  await requestAsAccessor(world, access);
});
