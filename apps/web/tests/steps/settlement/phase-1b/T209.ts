import { Then } from '../../../support/fixtures.js';
import {
  assertUnchangedArrangementScreen,
  unchangedArrangementScreenPhrase,
} from '../../../support/splitting/unchanged-arrangement-screen-result.js';

Then(unchangedArrangementScreenPhrase, async ({ page, world }) => {
  await assertUnchangedArrangementScreen(page, world);
});
