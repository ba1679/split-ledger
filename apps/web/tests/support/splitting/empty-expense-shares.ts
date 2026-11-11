import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import {
  arrangeSharedExpenseForm,
  sharedExpenseBeforeKey,
  sharedExpenseDraftKey,
  sharedExpensePostsKey,
  type SharedExpenseDraft,
} from './expense-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const emptyExpenseSharesPhrase = 'owner 已填共同支出點心但未選任何分攤者';

/** Arrange an invalid sharing selection through the real form, without submitting. */
export async function fillSnackWithoutShares(page: Page, world: LedgerWorld): Promise<void> {
  const form = await arrangeSharedExpenseForm(page, world);
  await form.choosePayer('Alice');
  // Start with all participants selected so this exercises clearing existing choices too.
  await form.chooseShares(['Alice', 'Amy', 'Bob']);
  await form.chooseShares([]);
  const draft: SharedExpenseDraft = {
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    categoryId: null,
    payerMemberId: world.splitting.ids.members.get('Alice')!,
    shareMemberIds: [],
  };
  world.set(sharedExpenseDraftKey, draft);
  expect(world.get<unknown[]>(sharedExpensePostsKey), 'Given must not submit a draft').toEqual([]);
  const before = world.get<BrowserSplittingSnapshot>(sharedExpenseBeforeKey);
  expect(await snapshotSplittingSources(world)).toEqual(before.sources);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}
