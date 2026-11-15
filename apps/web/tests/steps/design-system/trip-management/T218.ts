import { Given } from '../../../support/fixtures.js';
import { arrangeSettlementLoss } from '../../../support/loading/settlement-loss.js';

Given('實付結清已填合法草稿且保存會成功但回應遺失', async ({ page, world }) => {
  await arrangeSettlementLoss(page, world);
});
