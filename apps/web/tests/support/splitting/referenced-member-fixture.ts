import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  independentSplittingOracle,
  snapshotSplittingSources,
} from '../../../../api/tests/support/splitting/expense-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import {
  browserSplittingStateKey,
  readBrowserSplittingSnapshot,
  seedBrowserSplittingExpenses,
} from './fixture.js';
import type { BrowserDirectoryMember } from './member-directory-fixture.js';

export const referencedMemberPhrase = '小美已被三人 JPY 300 午餐及 JPY 20 還款引用';

export const referencedMemberStateKey = 'splitting:browserReferencedMember';

/** Stable historical identity shared by rename, deactivate and reactivation scenarios. */
export async function seedBrowserReferencedMember(page: Page, world: LedgerWorld): Promise<void> {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、小美、Bob' },
  ]);
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, '小美');
  const base = `/api/trips/${tripId}`;
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.map((row) => row.name).sort()).toEqual(['Alice', 'Bob', '小美']);
  expect(before.expenses.items).toHaveLength(1);
  const expense = before.expenses.items[0]!;
  expect(expense).toMatchObject({
    item: '午餐',
    amount: '300',
    currencyCode: 'JPY',
    minorUnit: 0,
    payerMemberId: splittingMemberId(world, 'Alice'),
    spentOn: '2027-03-11',
  });
  expect(expense.shares).toHaveLength(3);
  for (const share of expense.shares)
    expect(
      independentSplittingOracle.equal(share.amount, {
        numerator: '100',
        denominator: '1',
        minorUnit: 0,
      }),
    ).toBe(true);

  const request = {
    id: randomUUID(),
    payerMemberId: memberId,
    payeeMemberId: splittingMemberId(world, 'Alice'),
    amount: '20',
    currencyCode: 'JPY',
    paidOn: '2027-03-12',
  };
  const reply = await callApi(world, 'POST', `${base}/repayments`, request);
  expect(reply.status(), 'Product must save the referenced member repayment').toBe(201);
  const created = await reply.json();
  const after = await readBrowserSplittingSnapshot(world);
  for (const table of ['members', 'expenses', 'shares', 'settlements', 'adjustments'] as const)
    expect(after.sources[table]).toEqual(before.sources[table]);
  expect(after.totals).toEqual(before.totals);
  expect(after.sources.repayments).toHaveLength(1);
  const repayment = after.sources.repayments[0]!;
  expect(repayment).toMatchObject({
    id: request.id,
    trip_id: tripId,
    payer_member_id: memberId,
    payee_member_id: request.payeeMemberId,
    currency_code: 'JPY',
    minor_unit: 0,
    kind: 'independent',
    settlement_id: null,
  });
  expect(String(repayment.amount_minor)).toBe('20');
  const expectedRepayment = historicalRepaymentProjection(repayment);
  expect(expectedRepayment.paidOn).toBe(request.paidOn);
  expect(created).toEqual(expectedRepayment);
  expect(after.repayments.items).toEqual([expectedRepayment]);
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(before.settlement.accountingRevision) + 1n).toString(),
  );
  for (const [name, amount] of [
    ['Alice', '180'],
    ['小美', '-80'],
    ['Bob', '-100'],
  ] as const) {
    const id = splittingMemberId(world, name);
    const balance = after.settlement.balances.find(
      (row) => row.memberId === id && row.currencyCode === 'JPY',
    );
    expect(balance, `${name} must retain its nonzero JPY balance`).toBeDefined();
    expect(
      independentSplittingOracle.equal(balance!.netAmount, {
        numerator: amount,
        denominator: '1',
        minorUnit: 0,
      }),
    ).toBe(true);
  }
  const membersReply = await callApi(world, 'GET', `${base}/members`);
  expect(membersReply.status(), 'Product must expose the same historical member identities').toBe(
    200,
  );
  const members = ((await membersReply.json()) as { items: BrowserDirectoryMember[] }).items;
  expect(members.map((row) => row.id).sort()).toEqual(
    after.sources.members.map((row) => row.id).sort(),
  );
  for (const name of ['Alice', '小美', 'Bob'])
    expect(members.find((row) => row.id === splittingMemberId(world, name))).toMatchObject({
      tripId,
      name,
      role: name === 'Alice' ? 'owner' : 'companion',
      isActive: true,
    });

  world.set(referencedMemberStateKey, {
    memberId,
    expenseId: expense.id,
    repaymentId: request.id,
    request,
    before,
    after,
  });
  world.set(browserSplittingStateKey, after);
  world.set('splitting:memberId', memberId);
  world.set('splitting:repaymentId', request.id);
  world.set('splitting:sourceSnapshot', after.sources);
  world.set('splitting:revision', after.settlement.accountingRevision);
  world.splitting.ids.repayments.set('browserReferenced', request.id);
  world.splitting.snapshot = after.sources;
  const directoryRead = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `${base}/members`,
  );
  await page.goto(`/trips/${tripId}/members`);
  expect((await directoryRead).status(), 'Members screen must read the real directory').toBe(200);
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText('小美', { exact: true })).toBeVisible();
  expect(
    await snapshotSplittingSources(world),
    'Opening members must preserve historical sources',
  ).toEqual(after.sources);
}
