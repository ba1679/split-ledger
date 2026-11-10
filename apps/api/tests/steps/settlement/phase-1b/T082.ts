import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedSplittingSources,
  preservedSplittingSourcesPhrase,
} from '../../../support/splitting/preserved-splitting-sources.js';

Then(preservedSplittingSourcesPhrase, async ({ world }) => {
  await assertPreservedSplittingSources(world);
});
