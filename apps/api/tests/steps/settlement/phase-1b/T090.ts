import { Then } from '../../../support/fixtures.js';
import {
  assertModeBalancesUnchanged,
  modeBalanceInvariancePhrase,
} from '../../../support/splitting/mode-balance-invariance-result.js';

Then(modeBalanceInvariancePhrase, async ({ world }) => {
  await assertModeBalancesUnchanged(world);
});
