import { Given } from '../../../support/fixtures.js';
import { seedUnauthorizedSplittingAccount } from '../../../support/splitting/access-fixture.js';

Given('分帳旅行另有未獲授權的登入帳號', async ({ world }) => {
  await seedUnauthorizedSplittingAccount(world);
});
