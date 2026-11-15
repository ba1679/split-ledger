import { Given } from '../../../support/fixtures.js';
import { arrangeSettlementRecovery } from '../../../support/loading/settlement-recovery.js';

Given('原次實付結果未知且現在可查證', async ({ page, world }) => {
  await arrangeSettlementRecovery(page, world);
});
