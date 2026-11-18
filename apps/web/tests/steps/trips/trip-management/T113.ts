import { Given } from '../../../support/fixtures.js';
import { arrangeRecheck } from '../../../support/trips/recheck-fixture.js';

Given('原次 {string} 結果未知且現在可查證', async ({ page, world }, operation: string) => {
  await arrangeRecheck(page, world, operation);
});
