import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { amountInput, dateInput } from '../expense-helpers.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  lostExpenseCorrectionKey,
  type LostExpenseCorrectionState,
} from './lost-expense-correction.js';
import { assertSingleCorrectionSubmission } from './save-expense-correction.js';
import { expectedBalanceDisplay } from './member-balances-screen-result.js';

export const unconfirmedExpenseCorrectionPhrase = '修改草稿保留且未宣稱支出與分帳已更新';

/** The actual server has committed; the browser is deliberately unable to verify that fact. */
export function assertUnconfirmedCorrectionAuthority(
  state: LostExpenseCorrectionState,
  current: BrowserSplittingSnapshot,
): void {
  assertSingleCorrectionSubmission(state);
  expect(state.verificationAvailable).toBe(false);
  expect(
    state.authoritativeAfter,
    'Response loss must follow a real committed PATCH',
  ).toBeDefined();
  expect(current, 'Read-only verification must preserve the one committed correction').toEqual(
    state.authoritativeAfter,
  );
  expect(state.before.expenses.items.find((row) => row.id === state.expenseId)?.amount).toBe('300');
  expect(current.expenses.items.find((row) => row.id === state.expenseId)?.amount).toBe('200');
  expect(BigInt(current.settlement.accountingRevision)).toBe(
    BigInt(state.before.settlement.accountingRevision) + 1n,
  );
  expect(current.settlement.balances).not.toEqual(state.before.settlement.balances);
  expect(current.sources.repayments).toEqual(state.before.sources.repayments);
  expect(current.sources.settlements).toEqual(state.before.sources.settlements);
  expect(current.sources.adjustments).toEqual(state.before.sources.adjustments);
}

/** Then only observes the retained form, confirmed cache, requests and owner authority. */
export async function assertUnconfirmedExpenseCorrection(page: Page, world: LedgerWorld) {
  const state = world.get<LostExpenseCorrectionState>(lostExpenseCorrectionKey);
  const beforeUrl = page.url();
  const mutationCount = state.mutations.length;
  expect(world.get('splitting:expenseCorrectionSubmitted')).toEqual({
    expenseId: state.expenseId,
    draft: state.draft,
    outcome: 'unknown',
  });
  await expect(page.getByText(/保存結果尚未確認/).first()).toBeVisible();
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(state.draft.item);
  await expect(amountInput(page)).toHaveValue('200');
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(/^JPY\b/);
  await expect(dateInput(page)).toHaveValue(state.draft.spentOn.replaceAll('-', '/'));
  await expect(page.getByRole('combobox', { name: /^分類(?:選填)?$/ })).toHaveValue('未分類');
  for (const name of ['Alice', 'Amy', 'Bob']) {
    await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
    const payer = page.getByRole('radio', { name, exact: true });
    if (name === 'Alice') await expect(payer).toBeChecked();
    else await expect(payer).not.toBeChecked();
  }
  await expect(
    page
      .getByText(/支出已更新|更新成功|儲存成功|保存成功|分帳已更新|已完成重算/)
      .filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByText(/^(?:支出未保存|支出未儲存|支出未寫入|儲存失敗|保存失敗)$/)
      .filter({ visible: true }),
  ).toHaveCount(0);
  // A form need not render cached balances. If it does, they must be explicitly old,
  // and must still show the last confirmed revision rather than the unknown new one.
  const region = page.getByRole('region', { name: '成員淨額', exact: true });
  if (await region.isVisible()) {
    await expect(region).toContainText(/舊資料|上次已確認|更新前|尚未更新/);
    for (const balance of state.before.settlement.balances) {
      const member = state.before.sources.members.find((row) => row.id === balance.memberId)!;
      const group = region.getByRole('group', {
        name: `${String(member.name)} ${balance.currencyCode}`,
        exact: true,
      });
      await expect(
        group.getByText(expectedBalanceDisplay(balance.currencyCode, balance.netAmount), {
          exact: true,
        }),
      ).toBeVisible();
    }
  }
  const current = await readBrowserSplittingSnapshot(world);
  assertUnconfirmedCorrectionAuthority(state, current);
  expect(state.mutations).toHaveLength(mutationCount);
  expect(page.url(), 'Then must not navigate to obtain a newer projection').toBe(beforeUrl);
}
