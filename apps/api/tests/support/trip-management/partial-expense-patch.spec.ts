import { test, expect } from '../../../../web/tests/support/fixtures.js';
import { seedSplittingExpenses, snapshotSplittingSources } from '../splitting/expense-fixture.js';
import { splittingTripId } from '../splitting/members-fixture.js';
import { callApi } from '../seed.js';
import { login } from '../../../../web/tests/support/browser.js';
import { effectiveExpenseInput } from '../../../../web/tests/support/loading/expense-patch-input.js';
import type { Expense } from '../../../../web/src/api/index.js';

test('native minimal PATCH preserves omitted fields and updates the same expense and exact shares once', async ({
  page,
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy' },
  ]);
  const tripId = splittingTripId(world),
    id = world.splitting.ids.expenses.get('點心')!,
    path = `/api/trips/${tripId}/expenses/${id}`;
  const originalResponse = await callApi(world, 'GET', path);
  expect(originalResponse.status()).toBe(200);
  const original = (await originalResponse.json()) as Expense;
  const before = await snapshotSplittingSources(world);
  await login(page, world);
  await page.goto(`/trips/${tripId}`);
  await expect(page.getByText('點心', { exact: true })).toBeVisible();
  const writes: import('@playwright/test').Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && new URL(request.url()).pathname === path)
      writes.push(request);
  });
  const result = await page.evaluate(async (endpoint) => {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: '200' }),
    });

    return { status: response.status, body: await response.json() };
  }, path);
  expect(result.status).toBe(200);
  expect(writes.length).toBe(1);
  const wire = writes[0]!.postDataJSON() as Record<string, unknown>;
  expect(wire).toEqual({ amount: '200' });
  const input = effectiveExpenseInput(original, wire);
  expect(input).toEqual({
    item: original.item,
    amount: '200',
    currencyCode: original.currencyCode,
    spentOn: original.spentOn,
    categoryId: original.category?.id ?? null,
    payerMemberId: original.payerMemberId,
    shareMemberIds: original.shares.map((share) => share.memberId),
  });
  expect(result.body).toMatchObject({
    id,
    item: original.item,
    amount: '200',
    currencyCode: 'JPY',
    payerMemberId: original.payerMemberId,
  });
  expect(result.body.shares.length).toBe(2);
  for (const share of result.body.shares)
    expect(share.amount).toEqual({ numerator: '100', denominator: '1', minorUnit: 0 });
  const after = await snapshotSplittingSources(world);
  expect(after.expenses.length).toBe(1);
  expect(after.expenses[0]!.id).toBe(id);
  for (const key of ['members', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    String(BigInt(String(before.trips[0]!.accounting_revision)) + 1n),
  );
});
