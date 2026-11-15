import { Given } from '../../../support/fixtures.js';
import { arrangeBreakfast } from '../../../support/thumbnail/breakfast-fixture.js';

Given('圖片讀取已失敗且owner已開啟原旅行帳本', async ({ page, world }) => {
  await arrangeBreakfast(page, world);
});
