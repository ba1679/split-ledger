import { Then } from '../../../support/fixtures.js';
import { assertReplayPreservesIntent } from '../../../support/trip-management/replay-result.js';

Then('原收據重播而較新意圖保持不變', async ({ world }) => {
  await assertReplayPreservesIntent(world);
});
