import { Then } from '../../../support/fixtures.js';
import {
  assertUnconfirmedMember,
  unconfirmedMemberPhrase,
} from '../../../support/splitting/unconfirmed-member-result.js';

Then(unconfirmedMemberPhrase, async ({ page, world }) => {
  await assertUnconfirmedMember(page, world);
});
