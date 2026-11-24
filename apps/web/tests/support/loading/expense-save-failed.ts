import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import { assertExpenseSaveDraft, type ExpenseSaveDraft } from './expense-save-draft.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function assertExpenseSaveFailed(world: LedgerWorld): Promise<void> {
  const state = world.get<ExpenseSaveDraft>('loading:expenseSave'),
    ui = managementUI(world),
    page = ui.page;
  expect(state.responses.length).toBe(1);
  expect(state.responses[0]!.status()).toBe(400);
  const rejection = await state.responses[0]!.json();
  expect(rejection).toMatchObject({ code: 'VALIDATION_ERROR' });
  expect(rejection.message).toBe('輸入資料格式不正確。');
  await waitForManagementReads(ui);
  await assertExpenseSaveDraft(world);
  const error = page.getByRole('alert').filter({ hasText: rejection.message }).first();
  await expect(error).toBeVisible();
  await expect(error).toHaveText(rejection.message);
  await expect(error).not.toContainText(/23514|test_reject|isolated|constraint|postgres|SQLSTATE/i);
  await expect(state.data.control).toBeEnabled();
  await expect(page.getByLabel('支出金額', { exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: '支出日期', exact: true })).toBeEnabled();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: /保存成功|儲存成功|已更新支出|已重新計算|已重算/ }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(重新查證|再次查證)$/ })).toHaveCount(0);
  const original = await ownerRead(world, state.data.path);
  expect(original.status()).toBe(200);
  expect(await original.json()).toEqual(state.original);
  expect(await managementSnapshot(world)).toEqual(state.before);
  const balance = await ownerRead(world, `/api/trips/${state.data.tripId}/settlement`);
  expect(balance.status()).toBe(200);
  assertMemberBalanceProjection(
    state.before,
    await balance.json(),
    [
      { 成員: 'Alice', 幣別: 'JPY', 淨額: '50' },
      { 成員: 'Amy', 幣別: 'JPY', 淨額: '-50' },
    ],
    (name) => String(state.before.members.find((member) => member.name === name)!.id),
  );
  const saved = page.getByRole('list', { name: '支出分攤', exact: true });
  await expect(saved.getByRole('listitem')).toHaveCount(2);
  for (const name of ['Alice', 'Amy'])
    await expect(saved.getByRole('listitem').filter({ hasText: name })).toContainText('JPY 50');
  const untouched = world.get<{ id: string; before: TripManagementSnapshot }>(
    'loading:untouchedTrip',
  );
  expect(await managementSnapshot(world, untouched.id)).toEqual(untouched.before);
  await assertOtherDataUnchanged(world);
  expect(ui.writes.length).toBe(1);
}
