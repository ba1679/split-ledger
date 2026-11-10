import { Then } from '../../../support/fixtures.js';
import {
  assertPersistedSimplificationScreen,
  persistedSimplificationScreenPhrase,
} from '../../../support/splitting/persisted-simplification-screen-result.js';

Then(persistedSimplificationScreenPhrase, async ({ page, world }) => {
  await assertPersistedSimplificationScreen(page, world);
});
