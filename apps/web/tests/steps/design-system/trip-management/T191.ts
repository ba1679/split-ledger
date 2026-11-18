import { Given } from '../../../support/fixtures.js';
import { arrangeOperationWait } from '../../../support/loading/operation-wait.js';
import { executeOperation } from '../../../support/loading/operation-act.js';
import { assertOperationBusy } from '../../../support/loading/operation-busy.js';

Given('原次 {string} 正在處理且完成屏障可釋放', async ({ page, world }, operation: string) => {
  await arrangeOperationWait(page, world, operation);
  await executeOperation(world, operation);
  await assertOperationBusy(world);
});
