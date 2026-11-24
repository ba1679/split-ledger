import { randomUUID } from 'node:crypto';
import { expect, type Browser, type Page, type Route, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  managementSnapshot,
  managementTripId,
} from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../api/tests/support/trip-management/rejections.js';
import {
  arrangeManagementPage,
  managementUI,
  waitForManagementReads,
} from '../trips/management-fixture.js';
import { installLostDeleteResponse, type LostDeleteResponse } from './lost-delete-response.js';

export interface ExpenseVerificationDraft {
  item: string;
  amount: string;
  date: string;
  currency: string;
  category: string;
  payer: string;
  shares: string[];
}

export interface ExpenseDeleteVerification {
  scenario: string;
  tripId: string;
  expenseId: string;
  draft: ExpenseVerificationDraft;
  before: TripManagementSnapshot;
  afterLifecycle: TripManagementSnapshot;
  afterDelete?: TripManagementSnapshot;
  blocked: boolean;
  reads: { path: string; blocked: boolean; request: Request }[];
  transport: LostDeleteResponse;
}

export async function arrangeExpenseDeleteVerification(
  page: Page,
  browser: Browser,
  world: LedgerWorld,
  scenario: string,
): Promise<void> {
  expect(['一般可用且支出已刪', '垃圾桶', '已永久刪除']).toContain(scenario);
  await arrangeManagementPage(page, world, '帳本');
  const tripId = managementTripId(world),
    expenseId = world.splitting.ids.expenses.get('晚餐')!;
  const base = `/api/trips/${tripId}`,
    path = `${base}/expenses/${expenseId}`;
  await page.goto(`/trips/${tripId}/expenses/${expenseId}`);
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('晚餐');
  await expect(page.getByRole('radio', { name: 'Alice', exact: true })).toBeChecked();
  await waitForManagementReads(managementUI(world));
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
  const original = await ownerRead(world, path);
  expect(original.status()).toBe(200);
  expect(await original.json()).toMatchObject({ id: expenseId, tripId, item: draft.item });
  const before = await managementSnapshot(world);
  if (scenario !== '一般可用且支出已刪') {
    const other = await browser.newContext({ baseURL: world.get<string>('webOrigin') });
    try {
      await other.addCookies(await page.context().cookies());
      const headers = { origin: world.get<string>('webOrigin') };
      const trash = await other.request.post(`${base}/trash`, {
        headers,
        data: {
          operationId: randomUUID(),
          expectedLifecycleRevision: String(before.trips[0]!.lifecycle_revision),
        },
      });
      expect(trash.status()).toBe(200);
      const moved = await trash.json();
      if (scenario === '已永久刪除') {
        const purge = await other.request.post(`${base}/purge`, {
          headers,
          data: {
            operationId: randomUUID(),
            expectedLifecycleRevision: moved.currentState.lifecycleRevision,
          },
        });
        expect(purge.status()).toBe(200);
      }
      const state = await other.request.get(`${base}/state`);
      expect(state.status()).toBe(200);
      expect((await state.json()).state).toBe(scenario === '垃圾桶' ? 'trash' : 'purged');
    } finally {
      await other.close();
    }
  }
  const afterLifecycle = await managementSnapshot(world);
  if (scenario === '垃圾桶') {
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
      expect(afterLifecycle[key]).toEqual(before[key]);
    expect(String(afterLifecycle.trips[0]!.accounting_revision)).toBe(
      String(before.trips[0]!.accounting_revision),
    );
    expect(afterLifecycle.receipts.length).toBe(before.receipts.length + 1);
  } else if (scenario === '已永久刪除') {
    for (const key of [
      'trips',
      'members',
      'expenses',
      'shares',
      'repayments',
      'settlements',
      'adjustments',
      'thumbnails',
    ] as const)
      expect(afterLifecycle[key]).toEqual([]);
    expect(afterLifecycle.receipts.length).toBe(before.receipts.length + 2);
  }
  const state: ExpenseDeleteVerification = {
    scenario,
    tripId,
    expenseId,
    draft,
    before,
    afterLifecycle,
    blocked: true,
    reads: [],
    get transport() {
      return transport;
    },
  };
  const verify = async (route: Route) => {
    const request = route.request(),
      actual = new URL(request.url()).pathname;
    if (
      request.method() !== 'GET' ||
      !managementUI(world).writes.some(
        (write) => write.method() === 'DELETE' && new URL(write.url()).pathname === path,
      ) ||
      !(actual === base || actual.startsWith(`${base}/`))
    ) {
      await route.fallback();

      return;
    }
    state.reads.push({ path: actual, blocked: state.blocked, request });
    if (state.blocked) await route.abort('failed');
    else await route.fallback();
  };
  await page.route('**/api/**', verify);
  world.tripManagement.cleanups.add(async () => {
    if (!page.isClosed()) await page.unroute('**/api/**', verify);
  });
  const transport = await installLostDeleteResponse(page, path, async (response) => {
    const expected = scenario === '一般可用且支出已刪' ? 204 : scenario === '垃圾桶' ? 409 : 404;
    expect(response.status()).toBe(expected);
    if (expected !== 204)
      expect(await response.json()).toMatchObject({
        code: expected === 409 ? 'TRIP_TRASHED' : 'NOT_FOUND',
      });
    const after = await managementSnapshot(world);
    if (expected === 204) {
      expect(after.expenses).toEqual(before.expenses.filter((row) => row.id !== expenseId));
      expect(after.shares).toEqual(before.shares.filter((row) => row.expense_id !== expenseId));
      for (const key of [
        'members',
        'repayments',
        'settlements',
        'adjustments',
        'thumbnails',
        'reservations',
        'receipts',
        'categories',
      ] as const)
        expect(after[key]).toEqual(before[key]);
      expect(String(after.trips[0]!.accounting_revision)).toBe(
        String(BigInt(String(before.trips[0]!.accounting_revision)) + 1n),
      );
    } else expect(after).toEqual(afterLifecycle);
    expect(expectedCurrentState(after).state).toBe(
      scenario === '一般可用且支出已刪' ? 'active' : scenario === '垃圾桶' ? 'trash' : 'purged',
    );
    state.afterDelete = after;
    await assertOtherDataUnchanged(world);
  });
  world.tripManagement.cleanups.add(transport.dispose);
  world.set('expense:deleteVerification', state);
  await page.getByRole('button', { name: '刪除支出', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '確認刪除', exact: true }).click();
  await expect.poll(() => transport.done, { timeout: 15000 }).toBe(true);
  expect(transport.errors.map(String)).toEqual([]);
  await expect(page.getByText(/刪除結果(?:尚未確認|無法確認)/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^(重新查證|再次查證)$/ })).toBeEnabled();
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(draft.item);
  await expect(page.getByLabel('支出金額', { exact: true })).toHaveValue(draft.amount);
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

  expect(transport.calls).toBe(1);
  expect(managementUI(world).writes.length).toBe(1);
}
