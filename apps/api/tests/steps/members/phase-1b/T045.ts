import { When } from '../../../support/fixtures.js';
import {
  renameCompanion,
  renameMemberPhrase,
} from '../../../support/splitting/rename-member-command.js';

When(renameMemberPhrase, async ({ world }, oldName: string, newName: string) => {
  await renameCompanion(world, [oldName, newName]);
});
