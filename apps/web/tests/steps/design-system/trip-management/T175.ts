import { Given } from '../../../support/fixtures.js';
import { arrangeInitialRead } from '../../../support/loading/initial-read.js';

Given(
  '全站 {string} 的 {string} 初讀為 {string}',
  async ({ page, world }, screen: string, content: string, result: string) => {
    await arrangeInitialRead(page, world, screen, content, result);
  },
);
