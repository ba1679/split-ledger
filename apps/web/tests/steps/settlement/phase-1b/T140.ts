import { Given } from '../../../support/fixtures.js';
import {
  changeSnackOnAnotherDevice,
  staleSettlementFormPhrase,
} from '../../../support/splitting/stale-settlement-form.js';

Given(staleSettlementFormPhrase, async ({ page, world }) => {
  await changeSnackOnAnotherDevice(page, world);
});
