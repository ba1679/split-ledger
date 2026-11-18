import { Given } from '../../../support/fixtures.js';
import { arrangeInvalidSelection } from '../../../support/thumbnail/invalid-selection.js';

Given('待選圖片不合規原因為 {string}', async ({ world }, reason: string) => {
  await arrangeInvalidSelection(world, reason);
});
