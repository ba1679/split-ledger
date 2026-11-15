import { Given } from '../../../support/fixtures.js';
import { arrangeFormatPhoto } from '../../../support/thumbnail/format-photo.js';

Given(
  'owner 在 {string} 備有合法 {string} 照片',
  async ({ page, browser, world }, device: string, format: string) => {
    await arrangeFormatPhoto(page, browser, world, device, format);
  },
);
