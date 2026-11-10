import { When } from '../../../support/fixtures.js';
import {
  settleBobPhrase,
  settleRemainingBobArrangement,
} from '../../../support/splitting/settle-bob-command.js';

When(settleBobPhrase, async ({ world }) => {
  await settleRemainingBobArrangement(world);
});
