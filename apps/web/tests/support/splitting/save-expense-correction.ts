import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { amountInput } from '../expense-helpers.js';
import {
  assertDinnerCorrectionPayload,
  lostExpenseCorrectionKey,
  type LostExpenseCorrectionState,
} from './lost-expense-correction.js';

export const saveExpenseCorrectionPhrase = 'owner 保存共同支出修改';

/** The existing UUID identifies this PATCH; neither failure nor recovery creates a new command. */
export function assertSingleCorrectionSubmission(state: LostExpenseCorrectionState): void {
  expect(state.ids.commandId).toBe(state.expenseId);
  expect(state.mutations).toHaveLength(1);
  expect(state.mutations[0]!.method).toBe('PATCH');
  expect(state.mutations[0]!.path).toBe(`/api/trips/${state.tripId}/expenses/${state.expenseId}`);
  assertDinnerCorrectionPayload(state.mutations[0]!.body, state.draft);
  expect(state.ids.mutationIds).toEqual([state.expenseId]);
  expect(state.ids.lookupIds.every((id) => id === state.expenseId)).toBe(true);
}

export async function saveExpenseCorrection(page: Page, world: LedgerWorld): Promise<void> {
  const state = world.get<LostExpenseCorrectionState>(lostExpenseCorrectionKey);
  const originalId = state.expenseId;
  const originalDraft = structuredClone(state.draft);
  expect(
    state.interceptor,
    'Given must arm real response loss before the single click',
  ).toBeDefined();
  expect(state.verificationAvailable).toBe(false);
  expect(state.mutations).toEqual([]);
  await expect(amountInput(page)).toHaveValue(originalDraft.amount);
  const save = page.getByRole('button', { name: '儲存支出', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  // The interceptor fetches the real server first, verifies persisted shares and revision,
  // then drops its response. A transport error alone is never evidence of a completed write.
  await expect
    .poll(() => state.authoritativeAfter !== undefined, {
      timeout: 5000,
      message: 'The one real PATCH must have landed before its response is dropped',
    })
    .toBe(true);
  await expect(page.getByText(/保存結果尚未確認/)).toBeVisible();
  await expect(amountInput(page)).toHaveValue(originalDraft.amount);
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(originalDraft.item);
  assertSingleCorrectionSubmission(state);
  expect(state.expenseId).toBe(originalId);
  expect(state.draft).toEqual(originalDraft);
  world.set('splitting:expenseCorrectionSubmitted', {
    expenseId: originalId,
    draft: originalDraft,
    outcome: 'unknown',
  });
}
