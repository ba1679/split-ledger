import { Then } from '../../../support/fixtures.js';
import {
  assertDeactivatedMemberHistoryScreen,
  deactivatedMemberHistoryPhrase,
} from '../../../support/splitting/deactivated-member-history-result.js';

Then(deactivatedMemberHistoryPhrase, async ({ page, world }, name: string) => {
  await assertDeactivatedMemberHistoryScreen(page, world, name);
});
