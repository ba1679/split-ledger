import { Then } from '../../../support/fixtures.js';
import {
  assertCreatedCompanion,
  createdCompanionResultPhrase,
} from '../../../support/splitting/created-companion-result.js';

Then(createdCompanionResultPhrase, async ({ world }, name: string) => {
  await assertCreatedCompanion(world, name);
});
