import { When } from '../../../support/fixtures.js';
import { viewThumbnailCard } from '../../../support/thumbnail/view-card.js';

When('owner 查看旅行卡片', async ({ world }) => {
  await viewThumbnailCard(world);
});
