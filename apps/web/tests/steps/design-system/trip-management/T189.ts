import { When } from '../../../support/fixtures.js';
import { executeOperation } from '../../../support/loading/operation-act.js';

When('owner 執行全站操作 {string}', async ({ world }, operation: string) => {
  await executeOperation(world, operation);
});
