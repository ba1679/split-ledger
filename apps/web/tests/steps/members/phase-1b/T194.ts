import { Then } from '../../../support/fixtures.js';
import {
  assertDesktopSplittingResult,
  desktopSplittingResultPhrase,
} from '../../../support/splitting/desktop-splitting-result.js';

Then(desktopSplittingResultPhrase, async ({ world }) => {
  await assertDesktopSplittingResult(world);
});
