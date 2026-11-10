import { createBdd } from 'playwright-bdd';
import { When, test } from '../../../support/fixtures.js';
import {
  desktopSplittingKey,
  desktopSplittingPhrase,
  openDesktopSplitting,
  type DesktopSplitting,
} from '../../../support/splitting/desktop-splitting.js';

When(desktopSplittingPhrase, async ({ browser, world }) => {
  await openDesktopSplitting(browser, world);
});

const { After } = createBdd(test);
After(async ({ world }) => {
  const state = world.state.get(desktopSplittingKey) as DesktopSplitting | undefined;
  await state?.dispose();
  world.state.delete(desktopSplittingKey);
});
