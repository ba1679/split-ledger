import { Then } from '../../../support/fixtures.js';
import {
  assertReproducibleSettlement,
  reproducibleSettlementPhrase,
} from '../../../support/splitting/reproducible-settlement-result.js';

Then(reproducibleSettlementPhrase, async ({ world }) => {
  await assertReproducibleSettlement(world);
});
