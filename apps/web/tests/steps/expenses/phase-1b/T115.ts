import { Given } from '../../../support/fixtures.js';
import {
  fillMissingPayerDraft,
  missingPayerDraftPhrase,
} from '../../../support/splitting/missing-payer-draft.js';

Given(missingPayerDraftPhrase, async ({ page, world }) => {
  await fillMissingPayerDraft(page, world);
});
