import { Then } from '../../../support/fixtures.js';
import {
  assertOwnerMemberControls,
  ownerMemberControlsPhrase,
} from '../../../support/splitting/owner-member-controls-result.js';

Then(ownerMemberControlsPhrase, async ({ page, world }) => {
  await assertOwnerMemberControls(page, world);
});
