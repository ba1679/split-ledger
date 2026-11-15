import { Given } from '../../../support/fixtures.js';
import {
  arrangeSettlementLoss,
  type SettlementLoss,
} from '../../../support/loading/settlement-loss.js';
import { saveLostSettlement } from '../../../support/loading/save-lost-settlement.js';
import { assertSettlementVerifying } from '../../../support/loading/settlement-unknown.js';

Given('原次實付正在查證但本輪仍無法確認', async ({ page, world }) => {
  await arrangeSettlementLoss(page, world);
  await saveLostSettlement(world);
  await assertSettlementVerifying(world);
  const state = world.get<SettlementLoss>('loading:settlementLoss');
  world.set('loading:paymentVerificationRound', {
    commandId: state.command!.id,
    repaymentId: state.command!.repaymentId,
    reads: state.proofReads.length,
  });
});
