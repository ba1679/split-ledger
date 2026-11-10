import { Then } from '../../../support/fixtures.js';
import {
  assertRenamedMemberHistoryScreen,
  renamedMemberHistoryPhrase,
} from '../../../support/splitting/renamed-member-history-result.js';

Then(renamedMemberHistoryPhrase, async ({ page, world }, name: string) => {
  await assertRenamedMemberHistoryScreen(page, world, name);
});
