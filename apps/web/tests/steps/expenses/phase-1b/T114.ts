import { Given } from '../../../support/fixtures.js';
import {
  fillSharedSnackDraft,
  sharedExpenseDraftPhrase,
} from '../../../support/splitting/expense-draft.js';

Given(sharedExpenseDraftPhrase, async ({ page, world }, members: string) => {
  await fillSharedSnackDraft(page, world, members);
});
