import { When } from '../../../support/fixtures.js';
import { reconnectInitialRead } from '../../../support/loading/reconnect-initial.js';

When('網路恢復並完成原次旅行讀取', async ({ world }) => {
  await reconnectInitialRead(world);
});
