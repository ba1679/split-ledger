import { Given } from '../../../support/fixtures.js';
import { arrangeKeyboard } from '../../../support/loading/keyboard-fixture.js';

Given(
  'owner 使用 {string} 與鍵盤讀屏且偏好減少動態效果',
  async ({ page, world }, device: string) => {
    await arrangeKeyboard(page, world, device);
  },
);
