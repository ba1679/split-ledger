import { Given } from '../../../support/fixtures.js';
import { arrangeUnknownReset } from '../../../support/thumbnail/unknown-reset.js';

Given('預設縮圖保存已送出且查證結束仍未知', async ({ world }) => {
  await arrangeUnknownReset(world);
});
