import { Then } from '../../../support/fixtures.js';
import {
  assertSavedSimplification,
  savedSimplificationPhrase,
} from '../../../support/splitting/saved-simplification-result.js';

Then(savedSimplificationPhrase, async ({ world }, mode: string) => {
  await assertSavedSimplification(world, mode);
});
