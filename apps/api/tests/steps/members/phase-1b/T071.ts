import { Then } from '../../../support/fixtures.js';
import {
  assertCrossDeviceMembers,
  crossDeviceMembersResultPhrase,
} from '../../../support/splitting/cross-device-members-result.js';

Then(crossDeviceMembersResultPhrase, async ({ world }) => {
  await assertCrossDeviceMembers(world);
});
