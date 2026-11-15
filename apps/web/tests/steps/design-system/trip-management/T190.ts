import { Then } from '../../../support/fixtures.js';
import { assertOperationBusy } from '../../../support/loading/operation-busy.js';

Then('操作等待以置中圖形保留尺寸與操作語意', async ({ world }) => {
  await assertOperationBusy(world);
});
