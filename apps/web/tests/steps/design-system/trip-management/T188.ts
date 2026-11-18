import { Given } from '../../../support/fixtures.js';
import { arrangeOperationWait } from '../../../support/loading/operation-wait.js';

Given('owner 已備妥 {string} 且命令將延遲後成功', async ({ page, world }, operation: string) => {
  await arrangeOperationWait(page, world, operation);
});
