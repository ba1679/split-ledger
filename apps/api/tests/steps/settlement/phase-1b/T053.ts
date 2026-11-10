import { When } from '../../../support/fixtures.js';
import {
  requestAmySettlement,
  settleAmyPhrase,
} from '../../../support/splitting/settle-amy-command.js';

When(settleAmyPhrase, async ({ world }, paidAmount: string) => {
  await requestAmySettlement(world, paidAmount);
});
