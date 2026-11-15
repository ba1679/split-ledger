import { When, expect } from '../../../support/fixtures.js';
import type { ExpenseDeleteVerification } from '../../../support/expenses/delete-verification-fixture.js';
import {
  installExpenseStateAudit,
  restoreExpenseStateAudit,
} from '../../../support/expenses/state-read-audit.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';

When('owner 查證原次支出刪除', async ({ world }) => {
  const state = world.get<ExpenseDeleteVerification>('expense:deleteVerification');
  const ui = managementUI(world),
    statePath = `/api/trips/${state.tripId}/state`,
    expensePath = `/api/trips/${state.tripId}/expenses/${state.expenseId}`;
  await installExpenseStateAudit(ui.page);
  world.tripManagement.cleanups.add(async () => {
    await restoreExpenseStateAudit(ui.page);
  });
  const start = state.reads.length;
  state.blocked = false;
  await ui.page.getByRole('button', { name: /^(重新查證|再次查證)$/ }).click();
  const protocol = () =>
    state.reads.slice(start).filter((read) => [statePath, expensePath].includes(read.path));
  await expect.poll(() => protocol().length).toBeGreaterThan(0);
  expect(protocol()[0]!.path, 'Trip state must be the first verification request').toBe(statePath);
  const response = await protocol()[0]!.request.response();
  expect(response?.status()).toBe(200);
  expect(await response!.finished()).toBeNull();
  expect(await response!.json()).toEqual(expectedCurrentState(state.afterDelete!));
  if (state.scenario === '一般可用且支出已刪') {
    await expect.poll(() => protocol().some((read) => read.path === expensePath)).toBe(true);
    const expense = await protocol()
      .find((read) => read.path === expensePath)!
      .request.response();
    expect(expense?.status()).toBe(404);
    expect(await expense!.finished()).toBeNull();
  }
  expect(state.transport.calls).toBe(1);
  expect(ui.writes.length).toBe(1);
  world.set('expense:deleteVerificationAct', { readStart: start, state: await response!.json() });
});
