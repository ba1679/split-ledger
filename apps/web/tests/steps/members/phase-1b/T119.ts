import { Given } from '../../../support/fixtures.js';
import {
  mobileSavedSplittingPhrase,
  captureMobileSavedSplitting,
} from '../../../support/splitting/mobile-saved-fixture.js';

Given(mobileSavedSplittingPhrase, async ({ browser, world }) => {
  await captureMobileSavedSplitting(browser, world);
});
