import { Then } from '../../../support/fixtures.js';
import {
  assertCompanionStatus,
  memberStatusResultPhrase,
} from '../../../support/splitting/member-status-result.js';

Then(memberStatusResultPhrase, async ({ world }, name: string, status: string) => {
  await assertCompanionStatus(world, { name, status });
});
