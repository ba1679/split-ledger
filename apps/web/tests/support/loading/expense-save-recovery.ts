import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  arrangeRejectedExpenseSave,
  assertExpenseSaveDraft,
  type ExpenseSaveDraft,
} from './expense-save-draft.js';
import { saveExpenseDraft } from './save-expense.js';
import { assertExpenseSaveFailed } from './expense-save-failed.js';
import { managementUI } from '../trips/management-fixture.js';

export async function arrangeExpenseSaveRecovery(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeRejectedExpenseSave(page, world);
  await saveExpenseDraft(world);
  await assertExpenseSaveFailed(world);
  const state = world.get<ExpenseSaveDraft>('loading:expenseSave');
  const failedAttempts = await state.rejection.attempts();
  expect(failedAttempts).toBe(1);
  await state.rejection.dispose();
  state.expectedStatus = 200;
  await assertExpenseSaveDraft(world);
  await expect(state.data.control).toBeEnabled();
  expect(await managementSnapshot(world)).toEqual(state.before);
  expect(state.responses.length).toBe(1);
  expect(managementUI(world).writes.length).toBe(1);
  world.set('loading:expenseRetryReady', { failedAttempts, originalId: state.original.id });
}
