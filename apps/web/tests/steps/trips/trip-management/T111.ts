import { Given } from '../../../support/fixtures.js';
import { arrangeCommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';

Given('本次 {string} 已提交但回應將遺失且暫不可查證', async ({ world }, operation: string) => {
  await arrangeCommittedResponseLoss(world, operation);
});
