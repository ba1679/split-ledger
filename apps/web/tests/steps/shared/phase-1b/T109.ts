import { Then } from '../../../support/fixtures.js';
import {
  assertBrowserSourcesRemainUnchanged,
  preservedBrowserSourcesPhrase,
} from '../../../support/splitting/preserved-browser-sources.js';

Then(preservedBrowserSourcesPhrase, async ({ world }) => {
  await assertBrowserSourcesRemainUnchanged(world);
});
