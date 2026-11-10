import { Given } from '../../../support/fixtures.js';
import {
  anonymousBrowserPhrase,
  seedAnonymousBrowser,
} from '../../../support/splitting/anonymous-browser-fixture.js';

Given(anonymousBrowserPhrase, async ({ browser, world }) => {
  await seedAnonymousBrowser(browser, world);
});
