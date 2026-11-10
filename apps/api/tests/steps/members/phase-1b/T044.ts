import { When } from '../../../support/fixtures.js';
import {
  fixedOwnerMemberPhrase,
  requestFixedOwnerMemberMutation,
} from '../../../support/splitting/fixed-owner-member-command.js';

When(fixedOwnerMemberPhrase, async ({ world }, operation: string) => {
  await requestFixedOwnerMemberMutation(world, operation);
});
