import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { Given, Then, When, expect } from '../../support/fixtures.js';
import {
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from '../../support/splitting/fixture.js';
import { seedTaiwaneseCompanions } from '../../support/splitting/taiwanese-fixture.js';

type Input = {
  item: string;
  currencyCode: 'JPY' | 'TWD';
  amount: string;
  payer: string;
  share: string;
};

const beforeKey = '008:taiwanese-settlement-before';
const selfTwd: Input = {
  item: '台幣自付',
  currencyCode: 'TWD',
  amount: '100',
  payer: '小安',
  share: '小安',
};
const owingJpy: Input = {
  item: '日圓代付',
  currencyCode: 'JPY',
  amount: '1000',
  payer: '小安',
  share: '小宇',
};

async function addExpense(world: LedgerWorld, input: Input): Promise<void> {
  const response = await callApi(world, 'POST', `/api/trips/${splittingTripId(world)}/expenses`, {
    id: randomUUID(),
    item: input.item,
    currencyCode: input.currencyCode,
    amount: input.amount,
    spentOn: '2027-03-11',
    payerMemberId: splittingMemberId(world, input.payer),
    shareMemberIds: [splittingMemberId(world, input.share)],
  });
  expect(response.status()).toBe(201);
}

async function capture(world: LedgerWorld): Promise<BrowserSplittingSnapshot> {
  const snapshot = await readBrowserSplittingSnapshot(world);
  world.set(beforeKey, snapshot);

  return snapshot;
}

async function unchanged(world: LedgerWorld): Promise<BrowserSplittingSnapshot> {
  const snapshot = await readBrowserSplittingSnapshot(world);
  expect(snapshot).toEqual(world.get(beforeKey));

  return snapshot;
}

async function seedMixedCurrencies(page: Page, world: LedgerWorld): Promise<void> {
  await seedTaiwaneseCompanions(page, world);
  await addExpense(world, selfTwd);
  await addExpense(world, owingJpy);
  const { settlement } = await capture(world);
  const twd = settlement.balances.filter(({ currencyCode }) => currencyCode === 'TWD');
  expect(twd).toHaveLength(2);
  expect(twd.every(({ netAmount }) => BigInt(netAmount.numerator) === 0n)).toBe(true);
  expect(settlement.arrangements.map(({ currencyCode }) => currencyCode)).toEqual(['JPY']);
}

Given('繁中旅行的 TWD 成員淨額全為零且無 TWD 付款安排，JPY 仍有待付款', async ({ page, world }) => {
  await seedMixedCurrencies(page, world);
});

Given('繁中旅行關閉簡化付款且小宇應收小安 TWD 100、應付小美 TWD 100', async ({ page, world }) => {
  await seedTaiwaneseCompanions(page, world, ['小宇', '小美']);
  await addExpense(world, { ...selfTwd, item: '小宇代付', payer: '小宇', share: '小安' });
  await addExpense(world, { ...selfTwd, item: '小美代付', payer: '小美', share: '小宇' });
  const { settlement } = await capture(world);
  const middle = splittingMemberId(world, '小宇');
  expect(settlement.simplifyDebts).toBe(false);
  expect(settlement.balances).toContainEqual(
    expect.objectContaining({
      memberId: middle,
      currencyCode: 'TWD',
      netAmount: { numerator: '0', denominator: '1', minorUnit: 2 },
    }),
  );
  expect(settlement.arrangements).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        debtorMemberId: splittingMemberId(world, '小安'),
        creditorMemberId: middle,
        currencyCode: 'TWD',
        amount: { numerator: '10000', denominator: '1', minorUnit: 2 },
      }),
      expect.objectContaining({
        debtorMemberId: middle,
        creditorMemberId: splittingMemberId(world, '小美'),
        currencyCode: 'TWD',
        amount: { numerator: '10000', denominator: '1', minorUnit: 2 },
      }),
    ]),
  );
  expect(settlement.arrangements).toHaveLength(2);
});

Given('繁中旅行的 TWD 沒有付款安排而 JPY 仍有待付款', async ({ page, world }) => {
  await seedMixedCurrencies(page, world);
});

Given('繁中旅行所有幣別都沒有付款安排', async ({ page, world }) => {
  await seedTaiwaneseCompanions(page, world);
  await addExpense(world, selfTwd);
  await addExpense(world, { ...owingJpy, item: '日圓自付', share: '小安' });
  const { settlement } = await capture(world);
  expect(new Set(settlement.balances.map(({ currencyCode }) => currencyCode))).toEqual(
    new Set(['JPY', 'TWD']),
  );
  expect(settlement.arrangements).toEqual([]);
});

Given('繁中旅行有小宇應付小安 TWD 300 且已記錄實付 TWD 100', async ({ page, world }) => {
  await seedTaiwaneseCompanions(page, world);
  await addExpense(world, { ...selfTwd, item: '台幣代付', amount: '300', share: '小宇' });
  const response = await callApi(world, 'POST', `/api/trips/${splittingTripId(world)}/repayments`, {
    id: randomUUID(),
    amount: '100',
    currencyCode: 'TWD',
    payerMemberId: splittingMemberId(world, '小宇'),
    payeeMemberId: splittingMemberId(world, '小安'),
    paidOn: '2027-03-12',
  });
  expect(response.status()).toBe(201);
  const { settlement, repayments } = await capture(world);
  expect(repayments.items).toEqual([
    expect.objectContaining({ amount: '100.00', currencyCode: 'TWD' }),
  ]);
  expect(settlement.arrangements).toEqual([
    expect.objectContaining({
      amount: { numerator: '20000', denominator: '1', minorUnit: 2 },
    }),
  ]);
});

When('owner 查看旅行帳本淨額', async ({ page, world }) => {
  await page.goto(`/trips/${splittingTripId(world)}`);
  await expect(page.getByRole('region', { name: '成員淨額' })).toBeVisible();
});

function balanceRow(page: Page, member: string) {
  return page.getByRole('group', { name: `${member} TWD`, exact: true });
}

async function assertSettledTwd(page: Page, world: LedgerWorld): Promise<void> {
  for (const name of ['小安', '小宇'])
    await expect(balanceRow(page, name).getByText('已結清', { exact: true })).toBeVisible();
  await unchanged(world);
}

Then('帳本的 TWD 零淨額成員顯示「已結清」', async ({ page, world }) => {
  await assertSettledTwd(page, world);
});

Then('結算的 TWD 零淨額成員顯示「已結清」', async ({ page, world }) => {
  await assertSettledTwd(page, world);
});

async function assertZeroPending(page: Page, world: LedgerWorld): Promise<void> {
  await expect(balanceRow(page, '小宇').getByText('淨額為零', { exact: true })).toBeVisible();
  await expect(balanceRow(page, '小宇').getByText('已結清', { exact: true })).toHaveCount(0);
  await unchanged(world);
}

Then('帳本中小宇的 TWD 淨額顯示「淨額為零」', async ({ page, world }) => {
  await assertZeroPending(page, world);
});

Then('結算中小宇的 TWD 淨額顯示「淨額為零」且兩筆原付款安排仍可見', async ({ page, world }) => {
  await assertZeroPending(page, world);
  for (const label of ['小安 付款給 小宇 TWD', '小宇 付款給 小美 TWD'])
    await expect(page.getByRole('group', { name: label, exact: true })).toContainText(
      /TWD 100(?:\.00)?/u,
    );
  await expect(page.locator('.arrangement-row')).toHaveCount(2);
});

Then('「待付款」區顯示「TWD 無待付款項」和 JPY 待付款明細', async ({ page, world }) => {
  await expect(page.getByRole('heading', { name: '待付款', exact: true })).toBeVisible();
  await expect(page.getByText('TWD 無待付款項', { exact: true })).toHaveCount(1);
  await expect(
    page.getByRole('group', { name: '小宇 付款給 小安 JPY', exact: true }),
  ).toContainText(/JPY (?:1,000|1000)/u);
  await expect(page.getByText('目前沒有待付款項。', { exact: true })).toHaveCount(0);
  await unchanged(world);
});

Then('「待付款」區只顯示一次「目前沒有待付款項。」', async ({ page, world }) => {
  await expect(page.getByRole('heading', { name: '待付款', exact: true })).toBeVisible();
  await expect(page.getByText('目前沒有待付款項。', { exact: true })).toHaveCount(1);
  await expect(page.getByText(/^(TWD|JPY) 無待付款項/u)).toHaveCount(0);
  await expect(page.locator('.arrangement-row')).toHaveCount(0);
  expect((await unchanged(world)).settlement.arrangements).toEqual([]);
});

Then(
  '畫面以「應付金額」及「已付金額」區分 TWD 200 待付與 TWD 100 實付',
  async ({ page, world }) => {
    const due = page.locator('.arrangement-row').filter({ hasText: /TWD 200/u });
    await expect(due).toContainText('應付金額');
    const paid = page.locator('.repayment-history li').filter({ hasText: /TWD 100/u });
    await expect(paid).toContainText('已付金額');
    await unchanged(world);
  },
);
