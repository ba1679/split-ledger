import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { amountInput } from '../expense-helpers.js';
import { SharedExpenseForm } from './expense-draft.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserExpense,
  type BrowserSettlement,
  type BrowserSplittingSnapshot,
} from './fixture.js';

export const replaceDinnerSharingPhrase = 'owner 將晚餐改為 JPY 200、付款 Amy、分攤 Amy、Bob';

export const dinnerSharingChangeKey = 'splitting:dinnerSharingChange';

export interface DinnerSharingChange {
  expenseId: string;
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
  payload: Record<string, unknown>;
  response: unknown;
  browserSettlement: BrowserSettlement;
}

export function assertDinnerSharingPayload(
  payload: Record<string, unknown>,
  original: BrowserExpense,
  amyId: string,
  bobId: string,
): void {
  expect(payload).toMatchObject({ amount: '200', payerMemberId: amyId });
  expect(Array.isArray(payload.shareMemberIds)).toBe(true);
  expect([...(payload.shareMemberIds as string[])].sort()).toEqual([amyId, bobId].sort());
  const retained = {
    item: original.item,
    currencyCode: original.currencyCode,
    spentOn: original.spentOn,
    categoryId: original.category,
  };
  expect(
    Object.keys(payload).every(
      (key) => ['amount', 'payerMemberId', 'shareMemberIds'].includes(key) || key in retained,
    ),
  ).toBe(true);
  for (const [key, value] of Object.entries(retained))
    if (key in payload) expect(payload[key]).toEqual(value);
}

/** Changes only the existing dinner through one UI PATCH; no fixture reset or extra mode write. */
export async function replaceDinnerSharing(page: Page, world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  const matches = before.expenses.items.filter((expense) => expense.item === '晚餐');
  expect(matches, 'Given must identify one existing dinner').toHaveLength(1);
  const original = matches[0]!;
  expect(original.currencyCode).toBe('JPY');
  const amyId = world.splitting.ids.members.get('Amy')!;
  const bobId = world.splitting.ids.members.get('Bob')!;
  expect(amyId).toBeTruthy();
  expect(bobId).toBeTruthy();
  await page.goto(`/trips/${tripId}/expenses/${original.id}`);
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('晚餐');
  await amountInput(page).fill('200');
  const form = new SharedExpenseForm(page);
  await form.choosePayer('Amy');
  await form.chooseShares(['Amy', 'Bob']);
  const path = `/api/trips/${tripId}/expenses/${original.id}`;
  const writes: Request[] = [];
  const onRequest = (request: Request) => {
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith(`/api/trips/${tripId}`)
    )
      writes.push(request);
  };
  page.on('request', onRequest);
  try {
    const [response, ledgerResponse] = await Promise.all([
      page.waitForResponse(
        (reply) => reply.request().method() === 'PATCH' && new URL(reply.url()).pathname === path,
      ),
      page.waitForResponse(
        (reply) =>
          reply.request().method() === 'GET' &&
          new URL(reply.url()).pathname === `/api/trips/${tripId}/expenses`,
      ),
      page.getByRole('button', { name: '儲存支出', exact: true }).click(),
    ]);
    expect(response.status(), 'The existing dinner PATCH must succeed').toBe(200);
    expect(writes).toHaveLength(1);
    expect(writes[0]!.method()).toBe('PATCH');
    expect(new URL(writes[0]!.url()).pathname).toBe(path);
    const payload = writes[0]!.postDataJSON() as Record<string, unknown>;
    assertDinnerSharingPayload(payload, original, amyId, bobId);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ id: original.id, tripId, amount: '200', payerMemberId: amyId });
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/?$`));
    await expect(page.getByText('晚餐', { exact: true })).toBeVisible();
    const after = await readBrowserSplittingSnapshot(world);
    expect(ledgerResponse.status()).toBe(200);
    expect(await ledgerResponse.json()).toEqual(after.expenses);
    for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
      expect(after.sources[key]).toEqual(before.sources[key]);
    expect(after.repayments).toEqual(before.repayments);
    const originalSource = before.sources.expenses.find((row) => row.id === original.id)!;
    const updatedSource = after.sources.expenses.find((row) => row.id === original.id)!;
    expect(updatedSource, 'The existing expense row must remain present').toBeDefined();
    for (const [key, value] of Object.entries(originalSource))
      if (!['amount_minor', 'payer_member_id', 'updated_at'].includes(key))
        expect(updatedSource[key], `Dinner source field ${key} must be preserved`).toEqual(value);
    expect(after.sources.expenses.filter((row) => row.id !== original.id)).toEqual(
      before.sources.expenses.filter((row) => row.id !== original.id),
    );
    expect(after.sources.shares.filter((row) => row.expense_id !== original.id)).toEqual(
      before.sources.shares.filter((row) => row.expense_id !== original.id),
    );
    const saved = after.expenses.items.find((expense) => expense.id === original.id)!;
    expect(saved).toMatchObject({
      id: original.id,
      tripId,
      item: original.item,
      currencyCode: original.currencyCode,
      minorUnit: original.minorUnit,
      spentOn: original.spentOn,
      category: original.category,
      payerMemberId: amyId,
      amount: '200',
    });
    expect(saved.shares.map((share) => share.memberId).sort()).toEqual([amyId, bobId].sort());
    for (const share of saved.shares)
      expect(share.amount).toEqual({ numerator: '100', denominator: '1', minorUnit: 0 });
    expect(after.sources.expenses.map((row) => row.id).sort()).toEqual(
      before.sources.expenses.map((row) => row.id).sort(),
    );
    expect(after.settlement.simplifyDebts).toBe(before.settlement.simplifyDebts);
    expect(BigInt(after.settlement.accountingRevision)).toBe(
      BigInt(before.settlement.accountingRevision) + 1n,
    );
    // Inspect the browser settlement refresh after the ledger has received the changed expense.
    // The authority helper independently checks both expense shares and reconstructed balances.
    const [settlementReply] = await Promise.all([
      page.waitForResponse(
        (reply) =>
          reply.request().method() === 'GET' &&
          new URL(reply.url()).pathname === `/api/trips/${tripId}/settlement`,
      ),
      page.goto(`/trips/${tripId}/settlement`),
    ]);
    expect(settlementReply.status()).toBe(200);
    const browserSettlement = (await settlementReply.json()) as BrowserSettlement;
    expect(browserSettlement).toEqual(after.settlement);
    await expect(page.getByRole('switch', { name: '簡化付款', exact: true })).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(after);
    world.set(dinnerSharingChangeKey, {
      expenseId: original.id,
      before,
      after,
      payload,
      response: body,
      browserSettlement,
    } satisfies DinnerSharingChange);
    world.set('splitting:expenseId', original.id);
    world.set('splitting:before', before.sources);
    world.set('splitting:sourceSnapshot', after.sources);
    world.set('splitting:revision', after.settlement.accountingRevision);
    world.splitting.snapshot = after.sources;
  } finally {
    page.off('request', onRequest);
  }
}
