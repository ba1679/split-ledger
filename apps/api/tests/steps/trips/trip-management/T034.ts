import { Given } from '../../../support/fixtures.js';
import { arrangeUncommittedOperation } from '../../../support/trip-management/pending-operation.js';

Given('原旅行操作尚無可讀取收據', async ({ world }) => {
  await arrangeUncommittedOperation(world);
});
