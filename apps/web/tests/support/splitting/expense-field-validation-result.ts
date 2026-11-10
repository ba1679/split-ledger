import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { amountInput, dateInput } from '../expense-helpers.js';
import {
  expenseDraftMemberNames,
  sharedExpenseBeforeKey,
  sharedExpenseDraftKey,
  sharedExpensePostsKey,
  type SharedExpenseDraft,
} from './expense-draft.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { sharedExpenseSaveKey, type SharedExpenseSave } from './save-shared-expense.js';

export const missingPayerResultPhrase = '付款欄提示選擇付款人且帳務不變';

/** Observe the completed save only. This assertion never changes or resubmits the draft. */
export async function assertExpenseFieldValidation(
  page: Page,
  world: LedgerWorld,
  field: 'payer' | 'shares',
): Promise<void> {
  const draft = world.get<SharedExpenseDraft>(sharedExpenseDraftKey);
  const before = world.get<BrowserSplittingSnapshot>(sharedExpenseBeforeKey);
  const save = world.get<SharedExpenseSave>(sharedExpenseSaveKey);
  if (field === 'payer') {
    expect(draft.payerMemberId).toBeNull();
    expect(draft.shareMemberIds.length).toBeGreaterThan(0);
  } else {
    expect(draft.payerMemberId).not.toBeNull();
    expect(draft.shareMemberIds).toEqual([]);
  }
  expect(save.draft).toEqual(draft);
  expect(save.before).toEqual(before);
  expect(['local-validation', 'rejected']).toContain(save.outcome);
  if (save.outcome === 'rejected') {
    expect(save.status).toBeGreaterThanOrEqual(400);
    expect(save.status).toBeLessThan(500);
  }
  const message =
    field === 'payer'
      ? /(?:請|必須).*選.*付款人|付款人.*(?:必填|不可空白|必須選)/
      : /至少.*(?:選|勾).*(?:一|1).*(?:人|成員)|請.*選.*分攤/;
  await expect(
    page.getByText(message).first(),
    'The invalid field must show a readable instruction explaining how to correct it',
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/trips/${splittingTripId(world)}/expenses/new/?$`));
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(draft.item);
  await expect(amountInput(page)).toHaveValue(draft.amount);
  await expect(dateInput(page)).toHaveValue(draft.spentOn.replaceAll('-', '/'));
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(
    new RegExp(`^${draft.currencyCode}\\b`),
  );
  expect(draft.categoryId).toBeNull();
  await expect(page.getByRole('combobox', { name: /^分類(?:選填)?$/ })).toHaveValue('未分類');
  for (const name of expenseDraftMemberNames) {
    const memberId = world.splitting.ids.members.get(name)!;
    const payer = page.getByRole('radio', { name, exact: true });
    const share = page.getByRole('checkbox', { name, exact: true });
    await expect(payer).toBeVisible();
    await expect(share).toBeVisible();
    if (draft.payerMemberId === memberId) await expect(payer).toBeChecked();
    else await expect(payer).not.toBeChecked();
    if (draft.shareMemberIds.includes(memberId)) await expect(share).toBeChecked();
    else await expect(share).not.toBeChecked();
  }
  await expect(
    page.getByText(/(?:支出)?(?:已保存|已儲存|儲存成功|保存成功|新增成功|新增完成|重算完成)/),
  ).toHaveCount(0);
  const posts = structuredClone(world.get<unknown[]>(sharedExpensePostsKey));
  expect(posts).toEqual(save.payload ? [save.payload] : []);
  expect(
    posts.length,
    'Invalid input must never cause a second creation attempt',
  ).toBeLessThanOrEqual(1);
  expect(save.after).toEqual(before);
  expect(
    await readBrowserSplittingSnapshot(world),
    'All source rows, shares and projections stay unchanged',
  ).toEqual(before);
  // Authority reads must not provoke a late duplicate creation.
  expect(world.get<unknown[]>(sharedExpensePostsKey)).toEqual(posts);
}
