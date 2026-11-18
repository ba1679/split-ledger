import { Given } from '../../../support/fixtures.js';
import { arrangeFirstWriter } from '../../../support/trip-management/race-fixture.js';

Given('另一裝置的 {string} 已先取得旅行寫入順序', async ({ world }, operation: string) => {
  await arrangeFirstWriter(world, operation);
});
