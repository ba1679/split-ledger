import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementUI } from '../trips/management-fixture.js';
import { chooseCurrency } from '../expense-helpers.js';
import { assertRecoveredDraft, type RecoveredOptions } from './options-recovered.js';
import { optionRegion } from './option-wait.js';

export async function saveRecoveredExpense(world: LedgerWorld): Promise<void> {
  const state = world.get<RecoveredOptions>('loading:recoveredOptions'),
    ui = managementUI(world),
    page = ui.page;
  expect(ui.writes.length).toBe(0);
  await assertRecoveredDraft(world);
  await chooseCurrency(page, 'JPY');
  const category = page.getByRole('combobox', { name: /^分類(?:選填)?$/ });
  await category.fill('餐飲');
  await page.getByRole('option', { name: '餐飲', exact: true }).click();
  await page.getByRole('radio', { name: 'Alice', exact: true }).check();
  for (const name of ['Alice', 'Amy'])
    await page.getByRole('checkbox', { name, exact: true }).check();
  await assertRecoveredDraft(world);
  for (const option of ['幣別', '分類', '分攤成員']) {
    const region = optionRegion(page, option);
    await expect(region).not.toHaveAttribute('aria-busy', 'true');
    await expect(region.getByRole('status')).toHaveCount(0);
  }
  await expect(state.data.control).toBeEnabled();
  await state.data.control.click();
  await expect.poll(() => ui.writes.length).toBe(1);
  const request = ui.writes[0]!;
  expect(request.method()).toBe('POST');
  expect(new URL(request.url()).pathname).toBe(state.data.path);
  const input = request.postDataJSON() as Record<string, unknown>;
  expect(input.id).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  expect(input).toMatchObject({
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    payerMemberId: world.splitting.ids.members.get('Alice'),
    categoryId: state.before.categories.find(
      (row) => row.owner_id === world.users.get('Alice')!.id && row.name === '餐飲',
    )!.id,
  });
  expect([...(input.shareMemberIds as string[])].sort()).toEqual(
    [world.splitting.ids.members.get('Alice'), world.splitting.ids.members.get('Amy')].sort(),
  );
  const response = await request.response();
  expect(response?.status()).toBe(201);
  expect(await response!.finished()).toBeNull();
  state.savedBody = (await response!.json()) as Record<string, unknown>;
  state.savedId = String(input.id);
  expect(state.savedBody).toMatchObject({
    id: state.savedId,
    tripId: state.data.tripId,
    item: input.item,
    amount: input.amount,
    currencyCode: input.currencyCode,
    spentOn: input.spentOn,
    payerMemberId: input.payerMemberId,
    category: { id: input.categoryId, name: '餐飲' },
  });
  const shares = state.savedBody!.shares as { memberId: string; amount: unknown }[];
  expect(shares.map((share) => share.memberId).sort()).toEqual(
    [...(input.shareMemberIds as string[])].sort(),
  );
  for (const share of shares)
    expect(share.amount).toEqual({ numerator: '50', denominator: '1', minorUnit: 0 });
  expect(ui.writes.length).toBe(1);
}
