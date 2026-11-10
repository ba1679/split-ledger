import { createBdd } from 'playwright-bdd';
import { Given, test } from '../../../support/fixtures.js';
import {
  accessBrowserStateKey,
  otherAccountBrowserPhrase,
  seedOtherAccountBrowser,
  type AccessBrowserState,
} from '../../../support/splitting/other-account-browser-fixture.js';

Given(otherAccountBrowserPhrase, async ({ browser, world }) => {
  await seedOtherAccountBrowser(browser, world);
});

const { After } = createBdd(test);
After(async ({ world }) => {
  const state = world.state.get(accessBrowserStateKey) as AccessBrowserState | undefined;
  await state?.dispose();
  world.state.delete(accessBrowserStateKey);
});
