import { Given } from '../../../support/fixtures.js';
import { arrangeManagementPage } from '../../../support/trips/management-fixture.js';

Given('owner 的旅行管理畫面為 {string}', async ({ page, world }, state: string) => {
  await arrangeManagementPage(page, world, state);
});
