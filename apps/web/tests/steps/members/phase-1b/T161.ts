import { When } from '../../../support/fixtures.js';
import {
  openExpenseMemberOptions,
  expenseMemberOptionsPhrase,
} from '../../../support/splitting/expense-member-options.js';

When(expenseMemberOptionsPhrase, async ({ page, world }) => {
  await openExpenseMemberOptions(page, world);
});
