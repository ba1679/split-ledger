import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  fixtureMinorAmount,
  independentSplittingOracle,
} from '../../../../api/tests/support/splitting/expense-fixture.js';
import { amountInput } from '../expense-helpers.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserExpense,
  type BrowserSettlement,
  type BrowserSplittingSnapshot,
} from './fixture.js';

export const changeAdvanceAmountPhrase = 'owner 將代付金額改為 JPY 800';

export const expenseAmountChangeKey = 'splitting:expenseAmountChange';

export interface ExpenseAmountChange {
  expenseId: string;
  before: BrowserSplittingSnapshot;
  after: BrowserSplittingSnapshot;
  payload: Record<string, unknown>;
  response: unknown;
  status: number;
  revision: string;
  browserSettlement: BrowserSettlement;
}

/** Full form PATCH is permitted; unchanged fields must retain their original values. */
export function assertAmountOnlyPayload(
  payload: Record<string, unknown>,
  expense: BrowserExpense,
  amount: string,
): void {
  expect(payload.amount).toBe(amount);
  const unchanged = {
    item: expense.item,
    currencyCode: expense.currencyCode,
    spentOn: expense.spentOn,
    categoryId: expense.category,
    payerMemberId: expense.payerMemberId,
  };
  expect(
    Object.keys(payload).every(
      (key) => key === 'amount' || key === 'shareMemberIds' || key in unchanged,
    ),
  ).toBe(true);
  for (const [key, value] of Object.entries(unchanged))
    if (key in payload) expect(payload[key]).toEqual(value);
  if ('shareMemberIds' in payload)
    expect([...(payload.shareMemberIds as string[])].sort()).toEqual(
      expense.shares.map((share) => share.memberId).sort(),
    );
}

export function assertAmountChangeHistory(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  expenseId: string,
  amount: string,
): void {
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[key]).toEqual(before.sources[key]);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.sources.expenses.filter((row) => row.id !== expenseId)).toEqual(
    before.sources.expenses.filter((row) => row.id !== expenseId),
  );
  expect(after.sources.shares.filter((row) => row.expense_id !== expenseId)).toEqual(
    before.sources.shares.filter((row) => row.expense_id !== expenseId),
  );
  const original = before.expenses.items.find((row) => row.id === expenseId)!;
  const saved = after.expenses.items.filter((row) => row.id === expenseId);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    id: expenseId,
    tripId: original.tripId,
    item: original.item,
    currencyCode: original.currencyCode,
    minorUnit: original.minorUnit,
    spentOn: original.spentOn,
    category: original.category,
    payerMemberId: original.payerMemberId,
    amount,
  });
  expect(saved[0]!.shares.map((share) => share.memberId).sort()).toEqual(
    original.shares.map((share) => share.memberId).sort(),
  );
  for (const share of saved[0]!.shares)
    expect(
      independentSplittingOracle.equal(share.amount, {
        numerator: fixtureMinorAmount(amount, original.minorUnit).toString(),
        denominator: String(original.shares.length),
        minorUnit: original.minorUnit,
      }),
    ).toBe(true);
  expect(after.sources.expenses.map((row) => row.id).sort()).toEqual(
    before.sources.expenses.map((row) => row.id).sort(),
  );
  expect(after.settlement.simplifyDebts).toBe(before.settlement.simplifyDebts);
  expect(BigInt(after.settlement.accountingRevision)).toBe(
    BigInt(before.settlement.accountingRevision) + 1n,
  );
}

/** Reuses the existing Given's complete history. This When never seeds or resets data. */
export async function changeExpenseAmount(
  page: Page,
  world: LedgerWorld,
  item: string,
  amount: string,
): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  const matching = before.expenses.items.filter((expense) => expense.item === item);
  expect(matching, 'Given must identify exactly one existing expense').toHaveLength(1);
  const expense = matching[0]!;
  expect(expense.currencyCode).toBe('JPY');
  const path = `/api/trips/${tripId}/expenses/${expense.id}`;
  await page.goto(`/trips/${tripId}/expenses/${expense.id}`);
  await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue(item);
  await expect(amountInput(page)).toHaveValue(expense.amount);
  await amountInput(page).fill(amount);
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
    const [response] = await Promise.all([
      page.waitForResponse(
        (reply) => reply.request().method() === 'PATCH' && new URL(reply.url()).pathname === path,
      ),
      page.getByRole('button', { name: '儲存支出', exact: true }).click(),
    ]);
    expect(response.status(), 'Single UI PATCH must save the existing expense').toBe(200);
    expect(writes).toHaveLength(1);
    expect(writes[0]!.method()).toBe('PATCH');
    expect(new URL(writes[0]!.url()).pathname).toBe(path);
    const payload = writes[0]!.postDataJSON() as Record<string, unknown>;
    assertAmountOnlyPayload(payload, expense, amount);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ id: expense.id, tripId, amount });
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/?$`));
    const after = await readBrowserSplittingSnapshot(world);
    assertAmountChangeHistory(before, after, expense.id, amount);
    // Read through the browser, so a retained settlement cache cannot masquerade as a refresh.
    const [settlementResponse] = await Promise.all([
      page.waitForResponse(
        (reply) =>
          reply.request().method() === 'GET' &&
          new URL(reply.url()).pathname === `/api/trips/${tripId}/settlement`,
      ),
      page.goto(`/trips/${tripId}/settlement`),
    ]);
    expect(settlementResponse.status()).toBe(200);
    const browserSettlement = (await settlementResponse.json()) as BrowserSettlement;
    expect(browserSettlement).toEqual(after.settlement);
    await expect(page.getByRole('switch', { name: '簡化付款', exact: true })).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(after);
    world.set(expenseAmountChangeKey, {
      expenseId: expense.id,
      before,
      after,
      payload,
      response: body,
      status: response.status(),
      revision: after.settlement.accountingRevision,
      browserSettlement,
    } satisfies ExpenseAmountChange);
    world.set('splitting:expenseId', expense.id);
    world.set('splitting:before', before.sources);
    world.set('splitting:sourceSnapshot', after.sources);
    world.set('splitting:revision', after.settlement.accountingRevision);
    world.splitting.snapshot = after.sources;
  } finally {
    page.off('request', onRequest);
  }
}
