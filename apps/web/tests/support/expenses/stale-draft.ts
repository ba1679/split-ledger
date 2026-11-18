import { randomUUID } from 'node:crypto';
import { expect, type Browser, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import {
  assertOtherDataUnchanged,
  ownerRead,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../api/tests/support/trip-management/rejections.js';
import {
  arrangeManagementPage,
  managementUI,
  waitForManagementReads,
} from '../trips/management-fixture.js';
import { chooseCurrency } from '../expense-helpers.js';
import type { ExpenseVerificationDraft } from './delete-verification-fixture.js';

export interface StaleExpenseDraft {
  tripId: string;
  draft: ExpenseVerificationDraft;
  before: TripManagementSnapshot;
  trashed: TripManagementSnapshot;
  readStart?: number;
}

export async function assertSnackDraft(page: Page, draft: ExpenseVerificationDraft): Promise<void> {
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(draft.item);
  await expect(page.getByLabel('金額', { exact: true })).toHaveValue(draft.amount);
  await expect(
    page.getByRole('textbox', { name: '支出日期', exact: true, includeHidden: true }),
  ).toHaveValue(draft.date);
  await expect(
    page.getByRole('combobox', { name: '幣別', exact: true, includeHidden: true }),
  ).toHaveValue(draft.currency);
  await expect(
    page.getByRole('combobox', { name: /^分類(?:選填)?$/, includeHidden: true }),
  ).toHaveValue(draft.category);
  expect(await page.locator('input[type="radio"]:checked').inputValue()).toBe(draft.payer);
  expect(
    await page
      .locator('input[type="checkbox"]:checked')
      .evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).value).sort(),
      ),
  ).toEqual(draft.shares);
}

export async function arrangeStaleExpenseDraft(
  page: Page,
  browser: Browser,
  world: LedgerWorld,
): Promise<void> {
  await arrangeManagementPage(page, world, '帳本');
  const tripId = managementTripId(world);
  await page.getByRole('link', { name: '記一筆', exact: true }).click();
  await page.getByLabel('支出項目', { exact: true }).fill('點心');
  await chooseCurrency(page, 'JPY');
  await page.getByLabel('金額', { exact: true }).fill('500');
  await page.getByRole('radio', { name: 'Alice', exact: true }).check();
  for (const name of ['Alice', 'Amy'])
    await page.getByRole('checkbox', { name, exact: true }).check();
  await page.getByRole('checkbox', { name: 'Charlie', exact: true }).uncheck();
  await expect(page.getByRole('button', { name: '儲存支出', exact: true })).toBeEnabled();
  await waitForManagementReads(managementUI(world));
  const draft: ExpenseVerificationDraft = {
    item: '點心',
    amount: '500',
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
  const before = await managementSnapshot(world);
  const phone = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: { width: 390, height: 844 },
  });
  try {
    await phone.addCookies(await page.context().cookies());
    const response = await phone.request.post(`/api/trips/${tripId}/trash`, {
      headers: { origin: world.get<string>('webOrigin') },
      data: {
        operationId: randomUUID(),
        expectedLifecycleRevision: String(before.trips[0]!.lifecycle_revision),
      },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).currentState.state).toBe('trash');
  } finally {
    await phone.close();
  }
  const trashed = await managementSnapshot(world);
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
    'reservations',
    'categories',
  ] as const)
    expect(trashed[key]).toEqual(before[key]);
  expect(String(trashed.trips[0]!.accounting_revision)).toBe(
    String(before.trips[0]!.accounting_revision),
  );
  expect(trashed.receipts.length).toBe(before.receipts.length + 1);
  const state = await ownerRead(world, `/api/trips/${tripId}/state`);
  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(trashed));
  await assertSnackDraft(page, draft);
  expect(page.url()).toContain(`/trips/${tripId}/expenses/new`);
  expect(managementUI(world).writes.length).toBe(0);
  await assertOtherDataUnchanged(world);
  world.set('expense:staleDraft', { tripId, draft, before, trashed } satisfies StaleExpenseDraft);
}
