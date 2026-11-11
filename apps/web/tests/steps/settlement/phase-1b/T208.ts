import { Then } from '../../../support/fixtures.js';
import {
  assertSimplificationExplanationScreen,
  simplificationExplanationScreenPhrase,
} from '../../../support/splitting/simplification-explanation-screen-result.js';

Then(simplificationExplanationScreenPhrase, async ({ page, world }) => {
  await assertSimplificationExplanationScreen(page, world);
});
