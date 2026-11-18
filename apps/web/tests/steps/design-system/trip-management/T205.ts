import { When } from '../../../support/fixtures.js';
import { triggerBackground } from '../../../support/loading/trigger-background.js';

When('系統進行本次背景資料更新', async ({ world }) => {
  await triggerBackground(world);
});
