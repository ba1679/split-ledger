import { Then } from '../../../support/fixtures.js';
import {
  assertPrefilledSettlementDraft,
  prefilledSettlementDraftPhrase,
} from '../../../support/splitting/empty-settlement-draft-result.js';

Then(prefilledSettlementDraftPhrase, async ({ page, world }) => {
  await assertPrefilledSettlementDraft(page, world);
});
