import { Given } from '../../../support/fixtures.js';
import {
  emptyExpenseSharesPhrase,
  fillSnackWithoutShares,
} from '../../../support/splitting/empty-expense-shares.js';

Given(emptyExpenseSharesPhrase, async ({ page, world }) => {
  await fillSnackWithoutShares(page, world);
});
