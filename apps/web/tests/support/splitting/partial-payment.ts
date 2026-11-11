import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import type { SettleArrangementRequest } from '../../../src/features/settlement/types.js';
import {
  openBrowserSettlementForm,
  settlementFormKey,
  settlementBeforeKey,
  type BrowserSettlementDraft,
} from './settlement-form.js';

const deliveryKey = 'splitting:partialDelivery';
const actionKey = 'splitting:partialAction';
interface Delivery {
  available: boolean;
  saved?: unknown;
}
interface Action {
  before: BrowserSplittingSnapshot;
  command: SettleArrangementRequest;
  requests: SettleArrangementRequest[];
}

export async function losePartialReply(page: Page, world: LedgerWorld, availability: string) {
  expect(['可用', '暫不可用']).toContain(availability);
  const tripId = splittingTripId(world);
  const state: Delivery = { available: availability === '可用' };
  world.set(deliveryKey, state);
  const paymentId = await page.locator('form[data-repayment-id]').getAttribute('data-repayment-id');
  expect(paymentId).toBeTruthy();
  if (!state.available)
    await page.route(`**/api/trips/${tripId}/repayments/${paymentId}`, (route) =>
      route.abort('failed'),
    );
  await page.route(`**/api/trips/${tripId}/settlements`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    state.saved = await response.json();
    expect(state.saved).toMatchObject({ kind: 'partial' });
    await route.abort('failed');
  });
}

export async function recordPartialPayment(page: Page, world: LedgerWorld, amount: number) {
  const tripId = splittingTripId(world);
  const unavailable = world.state.has(deliveryKey) && !world.get<Delivery>(deliveryKey).available;
  await page.setViewportSize({ width: unavailable ? 375 : 1280, height: 900 });
  const before = await readBrowserSplittingSnapshot(world);
  const requests: SettleArrangementRequest[] = [];
  const id = await page.locator('form[data-command-id]').getAttribute('data-command-id');
  const paymentId = await page.locator('form[data-repayment-id]').getAttribute('data-repayment-id');
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === `/api/trips/${tripId}/settlements`
    )
      requests.push(request.postDataJSON() as SettleArrangementRequest);
  });
  await expect(page.getByLabel('實付金額', { exact: true })).toHaveValue('15000');
  await page.getByLabel('實付金額', { exact: true }).fill(String(amount));
  await page.getByRole('button', { name: '記錄部分還款', exact: true }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: '已記錄部分還款' })
      .or(page.getByRole('alert').filter({ hasText: '部分還款結果尚未確認' })),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ id, repaymentId: paymentId, paidAmount: String(amount) });
  world.set(actionKey, { before, command: requests[0]!, requests } satisfies Action);
}

export async function openCurrentPayment(page: Page, world: LedgerWorld, payer: string) {
  await openBrowserSettlementForm(page, world, payer);
}

export async function assertPrefilledRemaining(page: Page, world: LedgerWorld, amount: number) {
  const draft = world.get<BrowserSettlementDraft>(settlementFormKey);
  const before = world.get<BrowserSplittingSnapshot>(settlementBeforeKey);
  expect(draft.expectedAmount).toEqual({
    numerator: String(amount),
    denominator: '1',
    minorUnit: 0,
  });
  await expect(page.getByLabel('實付金額', { exact: true })).toHaveValue(String(amount));
  await expect(page.getByLabel('實付金額', { exact: true })).toBeEditable();
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}

async function assertPartialAuthority(world: LedgerWorld, paid: number, remaining: number) {
  const { before, command, requests } = world.get<Action>(actionKey);
  const after = await readBrowserSplittingSnapshot(world);
  expect(after.sources.expenses).toEqual(before.sources.expenses);
  expect(after.sources.shares).toEqual(before.sources.shares);
  expect(after.sources.settlements).toEqual(before.sources.settlements);
  expect(after.sources.adjustments).toEqual(before.sources.adjustments);
  expect(after.sources.repayments).toHaveLength(before.sources.repayments.length + 1);
  const payment = after.repayments.items.find((row) => row.id === command.repaymentId);
  expect(payment).toMatchObject({ kind: 'independent', settlementId: null, amount: String(paid) });
  expect(after.settlement.arrangements).toHaveLength(1);
  expect(after.settlement.arrangements[0]).toMatchObject({
    debtorMemberId: command.debtorMemberId,
    creditorMemberId: command.creditorMemberId,
    amount: { numerator: String(remaining), denominator: '1', minorUnit: 0 },
  });
  expect(requests).toHaveLength(1);
}

export async function assertPartialSaved(
  page: Page,
  world: LedgerWorld,
  paid: number,
  remaining: number,
) {
  await assertPartialAuthority(world, paid, remaining);
  const status = page.getByRole('status').filter({ hasText: '已記錄部分還款' });
  await expect(status).toContainText(`實付 JPY ${paid.toLocaleString('en-US')}`);
  await expect(status).toContainText(`尚欠 JPY ${remaining.toLocaleString('en-US')}`);
  await expect(status).toContainText('尚未結清');
  await expect(page.getByText(/結清成功/)).toHaveCount(0);
}

export async function assertPartialUnknown(page: Page, world: LedgerWorld) {
  const { command } = world.get<Action>(actionKey);
  await assertPartialAuthority(world, 2000, 13000);
  await expect(page.getByRole('alert').filter({ hasText: '部分還款結果尚未確認' })).toBeVisible();
  await expect(page.getByLabel('實付金額', { exact: true })).toHaveValue('2000');
  await expect(page.locator('form[data-command-id]')).toHaveAttribute(
    'data-command-id',
    command.id,
  );
  await expect(page.locator('form[data-repayment-id]')).toHaveAttribute(
    'data-repayment-id',
    command.repaymentId,
  );
  await expect(page.getByText(/已記錄部分還款|結清成功/)).toHaveCount(0);
  await page.unroute(`**/api/trips/${splittingTripId(world)}/repayments/${command.repaymentId}`);
  await page.getByRole('button', { name: '查證結果', exact: true }).click();
  await assertPartialSaved(page, world, 2000, 13000);
}
