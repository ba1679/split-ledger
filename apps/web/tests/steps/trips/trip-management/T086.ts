import { When } from '../../../support/fixtures.js';
import { selectThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';

When('owner 將縮圖預覽切為 {string}', async ({ world }, draft: string) => {
  await selectThumbnailDraft(world, draft);
});
