import { effectiveExpenseInput } from './expense-patch-input.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { ExpenseSaveDraft } from './expense-save-draft.js';
import { managementUI } from '../trips/management-fixture.js';

export async function saveExpenseDraft(world: LedgerWorld): Promise<void> {
  const state = world.get<ExpenseSaveDraft>('loading:expenseSave'),
    ui = managementUI(world);
  const start = ui.writes.length;
  expect(start).toBe(state.responses.length);
  const completed = ui.page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === state.data.path,
  );
  await state.data.control.click();
  const response = await completed;
  expect(response.status()).toBe(state.expectedStatus);
  expect(await response.finished()).toBeNull();
  expect(ui.writes.length).toBe(start + 1);
  const request = response.request();
  expect(ui.writes[start] === request).toBe(true);
  const body = request.postDataJSON() as Record<string, unknown>;
  const input = effectiveExpenseInput(state.original, body);
  expect(input).toMatchObject({
    item: state.draft.item,
    amount: state.draft.amount,
    currencyCode: state.original.currencyCode,
    spentOn: state.draft.date.replaceAll('/', '-'),
    categoryId: state.original.category?.id ?? null,
    payerMemberId: state.draft.payer,
  });
  expect([...(input.shareMemberIds as string[])].sort()).toEqual(state.draft.shares);
  expect(body.id).toBeUndefined();
  if (state.expectedStatus === 400) {
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await state.rejection.attempts()).toBe(1);
  } else
    expect(await response.json()).toMatchObject({
      id: state.original.id,
      amount: state.draft.amount,
    });
  state.responses.push(response);
  world.set('loading:expenseSaveRequest', {
    expenseId: state.original.id,
    method: request.method(),
    path: state.data.path,
    body,
    effectiveBody: input,
  });
}
