import { Given } from '../../../support/fixtures.js';
import { arrangeThumbnailDraft } from '../../../support/thumbnail/draft-fixture.js';

Given('目前縮圖草稿為 {string} 且尚未保存', async ({ world }, draft: string) => {
  await arrangeThumbnailDraft(world, draft);
});
