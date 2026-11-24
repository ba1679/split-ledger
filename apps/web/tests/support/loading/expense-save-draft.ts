import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import {
  installOwnedWriteRejection,
  type OwnedWriteRejection,
} from '../../../../api/tests/support/trip-management/write-rejection.js';
import type { Expense } from '../../../src/api/index.js';
import type { ExpenseVerificationDraft } from '../expenses/delete-verification-fixture.js';
import { arrangeOperationData, type OperationData } from './operation-data.js';
import { managementUI } from '../trips/management-fixture.js';

export interface ExpenseSaveDraft {
  data: OperationData;
  original: Expense;
  draft: ExpenseVerificationDraft;
  before: TripManagementSnapshot;
  rejection: OwnedWriteRejection;
  expectedStatus: number;
  responses: import('@playwright/test').Response[];
}

export async function assertExpenseSaveDraft(world: LedgerWorld): Promise<void> {
  const state = world.get<ExpenseSaveDraft>('loading:expenseSave'),
    page = managementUI(world).page;
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(state.draft.item);
  await expect(page.getByLabel('支出金額', { exact: true })).toHaveValue(state.draft.amount);
  await expect(page.getByRole('textbox', { name: '支出日期', exact: true })).toHaveValue(
    state.draft.date,
  );
  await expect(page.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(
    state.draft.currency,
  );
  await expect(page.getByRole('combobox', { name: /^分類(?:選填)?$/ })).toHaveValue(
    state.draft.category,
  );
  expect(await page.locator('input[type="radio"]:checked').inputValue()).toBe(state.draft.payer);
  expect(
    await page
      .locator('input[type="checkbox"]:checked')
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value).sort(),
      ),
  ).toEqual(state.draft.shares);
}

export async function arrangeRejectedExpenseSave(page: Page, world: LedgerWorld): Promise<void> {
  const data = await arrangeOperationData(page, world, '修改支出');
  const response = await ownerRead(world, data.path);
  expect(response.status()).toBe(200);
  const original = (await response.json()) as Expense;
  expect(original).toMatchObject({
    id: data.targetId,
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
  });
  const draft: ExpenseVerificationDraft = {
    item: await page.getByLabel('支出項目', { exact: true }).inputValue(),
    amount: await page.getByLabel('支出金額', { exact: true }).inputValue(),
    date: await page.getByRole('textbox', { name: '支出日期', exact: true }).inputValue(),
    currency: await page.getByRole('combobox', { name: '幣別', exact: true }).inputValue(),
    category: await page.getByRole('combobox', { name: /^分類(?:選填)?$/ }).inputValue(),
    payer: await page.locator('input[type="radio"]:checked').inputValue(),
    shares: await page
      .locator('input[type="checkbox"]:checked')
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value).sort(),
      ),
  };
  expect(draft.amount).toBe('200');
  expect(draft.amount).not.toBe(original.amount);
  expect(draft.payer).toBe(original.payerMemberId);
  expect(draft.shares).toEqual(original.shares.map((share) => share.memberId).sort());
  const before = await managementSnapshot(world);
  const rejection = await installOwnedWriteRejection(
    world,
    'expenses',
    world.users.get('Alice')!.id,
    data.tripId,
  );
  expect(await rejection.attempts()).toBe(0);
  world.set('loading:expenseSave', {
    data,
    original,
    draft,
    before,
    rejection,
    expectedStatus: 400,
    responses: [],
  } satisfies ExpenseSaveDraft);
  await assertExpenseSaveDraft(world);
  await expect(data.control).toBeEnabled();
  expect(managementUI(world).writes.length).toBe(0);
}
