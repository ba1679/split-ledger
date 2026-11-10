import { Given } from '../../../support/fixtures.js';
import {
  fillIndependentRepaymentDraft,
  repaymentDraftPhrase,
} from '../../../support/splitting/repayment-draft.js';

Given(repaymentDraftPhrase, async ({ page, world }, payee: string, amount: string) => {
  await fillIndependentRepaymentDraft(page, world, payee, amount);
});
