import { Then } from '../../../support/fixtures.js';
import {
  assertSimplificationExplanation,
  simplificationExplanationPhrase,
} from '../../../support/splitting/simplification-explanation-result.js';

Then(simplificationExplanationPhrase, async ({ world }) => {
  await assertSimplificationExplanation(world);
});
