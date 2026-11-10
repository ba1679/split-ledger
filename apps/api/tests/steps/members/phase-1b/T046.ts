import { When } from '../../../support/fixtures.js';
import {
  changeCompanionStatus,
  memberStatusPhrase,
} from '../../../support/splitting/member-status-command.js';

When(memberStatusPhrase, async ({ world }, name: string, status: string) => {
  await changeCompanionStatus(world, { name, status });
});
