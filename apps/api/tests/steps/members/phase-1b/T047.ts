import { When } from '../../../support/fixtures.js';
import {
  createCompanion,
  createMemberPhrase,
} from '../../../support/splitting/create-member-command.js';

When(createMemberPhrase, async ({ world }, name: string) => {
  await createCompanion(world, name);
});
