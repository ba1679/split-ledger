import { Given } from '../../../support/fixtures.js';
import { arrangeBackgroundRead } from '../../../support/loading/background-fixture.js';

Given('已載入 25 筆支出且背景更新將 {string}', async ({ page, world }, result: string) => {
  await arrangeBackgroundRead(page, world, result);
});
