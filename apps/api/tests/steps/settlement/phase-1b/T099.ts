import { Then } from '../../../support/fixtures.js';
import {
  assertUnchangedArrangementExplanation,
  unchangedArrangementExplanationPhrase,
} from '../../../support/splitting/unchanged-arrangement-explanation-result.js';

Then(unchangedArrangementExplanationPhrase, async ({ world }) => {
  await assertUnchangedArrangementExplanation(world);
});
