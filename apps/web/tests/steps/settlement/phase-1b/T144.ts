import { Given } from '../../../support/fixtures.js';
import {
  saveEnabledSimplification,
  savedSimplificationPhrase,
} from '../../../support/splitting/saved-simplification-fixture.js';

Given(savedSimplificationPhrase, async ({ world }) => {
  await saveEnabledSimplification(world);
});
