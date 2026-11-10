import { Then } from '../../../support/fixtures.js';
import {
  activeMemberOptionsPhrase,
  assertActiveMemberOptions,
} from '../../../support/splitting/active-member-options-result.js';

Then(activeMemberOptionsPhrase, async ({ page, world }, name: string) => {
  await assertActiveMemberOptions(page, world, name);
});
