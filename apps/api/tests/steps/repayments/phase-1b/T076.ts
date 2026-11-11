import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedOtherCurrencySources,
  preservedOtherCurrencySourcesPhrase,
} from '../../../support/splitting/preserved-other-currency-sources.js';

Then(preservedOtherCurrencySourcesPhrase, async ({ world }) => {
  await assertPreservedOtherCurrencySources(world);
});
