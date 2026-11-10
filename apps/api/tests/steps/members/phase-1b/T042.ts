import { createBdd } from 'playwright-bdd';
import { test, When } from '../../../support/fixtures.js';
import {
  crossDeviceMembersPhrase,
  disposeOtherDeviceApi,
  readMembersOnAnotherDevice,
} from '../../../support/splitting/cross-device-members-command.js';

When(crossDeviceMembersPhrase, async ({ world }) => {
  await readMembersOnAnotherDevice(world);
});

// Keep the APIResponse body available to subsequent Then steps until scenario teardown.
createBdd(test).After(async ({ world }) => {
  await disposeOtherDeviceApi(world);
});
