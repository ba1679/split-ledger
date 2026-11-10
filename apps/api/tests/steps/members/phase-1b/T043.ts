import { When } from '../../../support/fixtures.js';
import {
  deleteCompanion,
  deleteMemberPhrase,
} from '../../../support/splitting/delete-member-command.js';

When(deleteMemberPhrase, async ({ world }, name: string) => {
  await deleteCompanion(world, name);
});
