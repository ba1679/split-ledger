import { When } from '../../../support/fixtures.js';
import { repeatOperation } from '../../../support/loading/repeat-operation.js';

When('owner 在等待中連續再次觸發相同操作', async ({ world }) => {
  await repeatOperation(world);
});
