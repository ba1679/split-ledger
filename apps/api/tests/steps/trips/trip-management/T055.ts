import { Given } from '../../../support/fixtures.js';
import { arrangeTransport } from '../../../support/trip-management/transport-fixture.js';

Given('縮圖傳輸條件為 {string}', async ({ world }, condition: string) => {
  await arrangeTransport(world, condition);
});
