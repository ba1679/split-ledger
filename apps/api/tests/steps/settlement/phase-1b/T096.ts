import { Then } from '../../../support/fixtures.js';
import {
  assertNoOutstandingArrangements,
  noOutstandingArrangementsPhrase,
} from '../../../support/splitting/no-outstanding-arrangements-result.js';

Then(noOutstandingArrangementsPhrase, async ({ world }) => {
  await assertNoOutstandingArrangements(world);
});
