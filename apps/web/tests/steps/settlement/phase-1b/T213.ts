import { Then } from '../../../support/fixtures.js';
import {
  assertEmptySettlementDraft,
  emptySettlementDraftPhrase,
} from '../../../support/splitting/empty-settlement-draft-result.js';

Then(emptySettlementDraftPhrase, async ({ page, world }) => {
  await assertEmptySettlementDraft(page, world);
});
