import { Given } from '../../../support/fixtures.js';
import { selectInvalidImage } from '../../../support/trip-management/invalid-images.js';

Given('待保存檔案內容為 {string}', async ({ world }, label: string) => {
  await selectInvalidImage(world, label);
});
