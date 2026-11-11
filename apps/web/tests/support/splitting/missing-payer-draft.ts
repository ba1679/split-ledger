import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { amountInput, dateInput } from '../expense-helpers.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  arrangeSharedExpenseForm,
  expenseDraftMemberNames,
  sharedExpenseBeforeKey,
  sharedExpenseDraftKey,
  sharedExpensePostsKey,
  type SharedExpenseDraft,
} from './expense-draft.js';

export const missingPayerDraftPhrase = 'owner 已填共同支出點心但未選付款人';

/** Replace only the document entry, preserving the real Vite modules, session and API. */
export async function mountMissingPayerDraft(
  page: Page,
  tripId: string,
  draft: SharedExpenseDraft,
): Promise<void> {
  expect(draft.payerMemberId).toBeNull();
  expect(draft.shareMemberIds.length).toBeGreaterThan(0);
  const path = `/trips/${tripId}/expenses/new`;
  // JSON in a script data block must not be able to terminate that block.
  const data = JSON.stringify(draft).replaceAll('<', '\\u003c');
  await page.route(`**${path}`, async (route) => {
    if (!route.request().isNavigationRequest() || route.request().resourceType() !== 'document') {
      await route.continue();

      return;
    }
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><div id="root"></div><script type="application/json" id="missing-payer-initial-draft">${data}</script><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/@vite/client"></script><script type="module" src="/tests/support/splitting/missing-payer-entry.ts"></script></html>`,
    });
  });
  await page.goto(path);
  await expect(page.getByLabel('支出項目', { exact: true })).toBeVisible();
  // A missing component prop or missing payer UI is an explicit product-contract RED.
  for (const name of expenseDraftMemberNames) {
    const payer = page.getByRole('radio', { name, exact: true });
    await expect(payer, 'The real expense component must expose its payer choices').toBeVisible();
    await expect(payer, 'The public initialDraft must preserve a null payer').not.toBeChecked();
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
  }
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('點心');
  await expect(amountInput(page)).toHaveValue('100');
  await expect(dateInput(page)).toHaveValue('2027/03/11');
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(/^JPY\b/);
  await expect(page.getByRole('combobox', { name: /^分類(?:選填)?$/ })).toHaveValue('未分類');
  await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeVisible();
}

export async function fillMissingPayerDraft(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeSharedExpenseForm(page, world);
  const draft: SharedExpenseDraft = {
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    categoryId: null,
    payerMemberId: null,
    shareMemberIds: expenseDraftMemberNames.map((name) => world.splitting.ids.members.get(name)!),
  };
  world.set(sharedExpenseDraftKey, draft);
  await mountMissingPayerDraft(page, splittingTripId(world), draft);
  expect(
    world.get<unknown[]>(sharedExpensePostsKey),
    'Given must not save the invalid draft',
  ).toEqual([]);
  const before = world.get<BrowserSplittingSnapshot>(sharedExpenseBeforeKey);
  expect(await snapshotSplittingSources(world)).toEqual(before.sources);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}
