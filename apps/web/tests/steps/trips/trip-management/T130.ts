import { Given } from '../../../support/fixtures.js';
import { arrangeAccountSwitch } from '../../../support/trips/account-switch-fixture.js';

Given('Alice 已查看私人旅行與垃圾桶且有未保存照片預覽', async ({ page, world }) => {
  await arrangeAccountSwitch(page, world);
});
