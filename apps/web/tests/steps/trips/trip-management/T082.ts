import { Given } from '../../../support/fixtures.js';
import { arrangeEmptyList } from '../../../support/trips/empty-list-fixture.js';

Given('目前 {string} 已成功確認沒有旅行', async ({ page, world }, scope: string) => {
  await arrangeEmptyList(page, world, scope);
});
