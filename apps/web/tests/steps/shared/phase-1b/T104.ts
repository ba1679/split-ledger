import { Given } from '../../../support/fixtures.js';
import {
  browserSettledArrangementPhrase,
  settleBrowserAmyArrangement,
} from '../../../support/splitting/settled-arrangement-fixture.js';

Given(browserSettledArrangementPhrase, async ({ world }) => {
  await settleBrowserAmyArrangement(world);
});
